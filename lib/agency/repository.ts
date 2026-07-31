import type { AgencyActor, AgencyCommand, AgencyCommandKind, MyDay } from "./domain";

export interface AgencyProjectAccess {
  projectAccessible: boolean;
  projectAssigned: boolean;
}

export interface AgencyCommandReceipt {
  id: number;
  kind: AgencyCommandKind;
  organizationId: number;
  createdAt: string;
}

/**
 * Persistence boundary for agency workflows.
 *
 * Implementations must include organizationId in every SELECT/UPDATE/DELETE
 * predicate. Checking an ID first and querying it globally afterward is not safe.
 */
export interface AgencyWorkflowRepository {
  resolveProjectAccess(actor: AgencyActor, projectId: number): Promise<AgencyProjectAccess>;
  execute(actor: AgencyActor, command: AgencyCommand): Promise<AgencyCommandReceipt>;
  getMyDay(actor: AgencyActor, date: string): Promise<MyDay>;
}

export class AgencyPersistenceUnavailableError extends Error {
  constructor() {
    super("Agency workflow persistence has not been provisioned for this organization.");
    this.name = "AgencyPersistenceUnavailableError";
  }
}

export class UnavailableAgencyWorkflowRepository implements AgencyWorkflowRepository {
  async resolveProjectAccess(): Promise<AgencyProjectAccess> {
    throw new AgencyPersistenceUnavailableError();
  }

  async execute(): Promise<AgencyCommandReceipt> {
    throw new AgencyPersistenceUnavailableError();
  }

  async getMyDay(): Promise<MyDay> {
    throw new AgencyPersistenceUnavailableError();
  }
}
