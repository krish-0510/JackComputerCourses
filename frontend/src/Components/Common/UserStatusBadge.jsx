import { USER_BLOCKED_META, USER_STATUS_META, getUserStatus, isUserBlocked } from './userStatus'

// The word is always on the badge, so the standing never rests on its colour alone. A
// blocked account carries a second badge rather than losing its first: whether it is
// enrolled and whether it may log in are two different facts, and hiding either one behind
// the other is how a roster starts lying about who is still a student.
const UserStatusBadge = ({ user, className = '' }) => {
  const badges = [USER_STATUS_META[getUserStatus(user)]]

  if (isUserBlocked(user)) {
    badges.push(USER_BLOCKED_META)
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((meta) => (
        <span
          key={meta.label}
          title={meta.hint}
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.className}`}
        >
          {meta.label}
        </span>
      ))}
    </span>
  )
}

export default UserStatusBadge
