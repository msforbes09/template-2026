// The label on a folded reply thread. The project team's answer is the one a
// reader most wants to notice, so it is named rather than folded into a count.
export function repliesSummary(replies: { is_owner: 0 | 1 }[]): string | null {
  if (replies.length === 0) return null;

  const noun = replies.length === 1 ? "reply" : "replies";
  const count = `${replies.length} ${noun}`;
  const fromOwner = replies.some((reply) => reply.is_owner === 1);

  if (!fromOwner) return count;
  return replies.length === 1
    ? `${count} from the project team`
    : `${count}, including the project team`;
}
