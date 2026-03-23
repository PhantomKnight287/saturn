export interface OrgMember {
  createdAt: Date
  memberId: string
  role: string
  userEmail: string
  userId: string
  userImage: string | null
  userName: string
}

export interface OrgTeamWithMembers {
  createdAt: Date
  members: {
    teamMemberId: string
    userEmail: string
    userId: string
    userImage: string | null
    userName: string
  }[]
  teamId: string
  teamName: string
}

export interface PendingInvitation {
  email: string
  expiresAt: Date
  id: string
  role: string
  status: string
}

export interface TeamsPageClientProps {
  canManage: boolean
  currentMemberId: string
  invitations: PendingInvitation[]
  members: OrgMember[]
  orgSlug: string
  organizationId: string
  teams: OrgTeamWithMembers[]
}
