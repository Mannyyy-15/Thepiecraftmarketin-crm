import { agencyActorSchema, agencyCommandSchema, type AgencyActor, type AgencyCommand } from "./domain";
import { authorizeAgencyCommand } from "./policy";
import {
  AgencyPersistenceUnavailableError,
  type AgencyCommandReceipt,
  type AgencyWorkflowRepository,
} from "./repository";

export type AgencyServiceResult<T> =
  | { success: true; data: T }
  | { success: false; code: "invalid_input" | "forbidden" | "not_configured" | "internal_error"; error: string };

export class AgencyWorkflowService {
  constructor(private readonly repository: AgencyWorkflowRepository) {}

  async execute(actorInput: AgencyActor, commandInput: AgencyCommand): Promise<AgencyServiceResult<AgencyCommandReceipt>> {
    const actor = agencyActorSchema.safeParse(actorInput);
    const command = agencyCommandSchema.safeParse(commandInput);
    if (!actor.success) {
      return { success: false, code: "invalid_input", error: actor.error.issues[0]?.message ?? "Invalid actor." };
    }
    if (!command.success) {
      return { success: false, code: "invalid_input", error: command.error.issues[0]?.message ?? "Invalid command." };
    }

    try {
      const access = "projectId" in command.data.input
        ? await this.repository.resolveProjectAccess(actor.data, command.data.input.projectId)
        : { projectAccessible: true, projectAssigned: true };
      const decision = authorizeAgencyCommand({
        actor: actor.data,
        command: command.data,
        ...access,
      });
      if (!decision.allowed) {
        return { success: false, code: "forbidden", error: "You do not have access to perform this action." };
      }

      const receipt = await this.repository.execute(actor.data, command.data);
      return { success: true, data: receipt };
    } catch (error) {
      if (error instanceof AgencyPersistenceUnavailableError) {
        return { success: false, code: "not_configured", error: error.message };
      }
      console.error("[AgencyWorkflowService] Command failed", {
        kind: command.data.kind,
        organizationId: actor.data.organizationId,
        error,
      });
      return { success: false, code: "internal_error", error: "The workflow action could not be completed." };
    }
  }
}
