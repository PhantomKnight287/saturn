import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, ownerAc } from "better-auth/plugins/organization/access";

const ac = createAccessControl({
  projects: ["create", "update", "delete", "read"],
});

export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    projects: ["create", "update", "delete", "read"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    projects: ["create", "update", "delete", "read"],
  }),
  lead: ac.newRole({
    projects: ["create", "update", "read"],
  }),
  member: ac.newRole({
    projects: ["read"],
  }),
};
