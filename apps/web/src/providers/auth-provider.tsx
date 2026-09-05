import { createContext, useContext, useMemo, type ReactNode } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import type { Role } from "@abms/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  avatarUrl: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  notifyEmailEnabled: boolean;
  notifyInAppEnabled: boolean;
  notificationCategoryPrefs: string | null;
  createdAt: string;
}

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      role
      active
      avatarUrl
      phone
      jobTitle
      bio
      notifyEmailEnabled
      notifyInAppEnabled
      notificationCategoryPrefs
      createdAt
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      id
      email
      name
      role
      active
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      id
      email
      name
      role
      active
    }
  }
`;

const ACCEPT_INVITE_MUTATION = gql`
  mutation AcceptInvite($input: AcceptInviteInput!) {
    acceptInvite(input: $input) {
      id
      email
      name
      role
      active
    }
  }
`;

interface SignupArgs {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

interface AcceptInviteArgs {
  token: string;
  name: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** True when the `me` check itself failed (server unreachable) — distinct from a confirmed "not logged in". */
  unreachable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (input: SignupArgs) => Promise<void>;
  acceptInvite: (input: AcceptInviteArgs) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useQuery(ME_QUERY, { fetchPolicy: "network-only", errorPolicy: "all" });
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [acceptInviteMutation] = useMutation(ACCEPT_INVITE_MUTATION);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data?.me ?? null,
      loading,
      unreachable: !loading && !!error && data?.me === undefined,
      login: async (email: string, password: string) => {
        await loginMutation({ variables: { input: { email, password } } });
        await refetch();
      },
      logout: async () => {
        await logoutMutation();
        await refetch();
      },
      signup: async (input: SignupArgs) => {
        await signupMutation({ variables: { input } });
        await refetch();
      },
      acceptInvite: async (input: AcceptInviteArgs) => {
        await acceptInviteMutation({ variables: { input } });
        await refetch();
      },
    }),
    [data, loading, error, loginMutation, logoutMutation, signupMutation, acceptInviteMutation, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
