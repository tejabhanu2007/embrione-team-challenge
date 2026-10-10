export type MemberStatus = "pending" | "approved" | "rejected";

export type Member = {
  id: string;
  name: string;
  domain: string;
  position: string;
  srn: string;
  email: string;
  linkedin_url: string | null;
  github_url: string | null;
  branch: string;
  semester: number;
  bio: string | null;
  photo_url: string;
  status: MemberStatus;
  created_at: string;
};

export type MemberCardData = Pick<
  Member,
  "name" | "domain" | "position" | "branch" | "semester" | "bio" | "photo_url" | "linkedin_url" | "github_url"
>;

export type PublicMember = Pick<
  Member,
  | "id"
  | "name"
  | "domain"
  | "position"
  | "branch"
  | "semester"
  | "bio"
  | "photo_url"
  | "linkedin_url"
  | "github_url"
  | "status"
  | "created_at"
>;
