import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md border border-ink-2 px-3 py-1.5 text-sm text-ink-4 hover:bg-ink-1"
      >
        Sign out
      </button>
    </form>
  );
}
