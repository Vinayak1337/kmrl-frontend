import { useApp } from "../src/store";
import { humanize } from "../src/domain";
import { Empty, Notice, Row, Screen, Text } from "../src/ui";
export default function Access() {
  const user = useApp((s) => s.session?.user);
  return (
    <Screen>
      <Text size="title">My access</Text>
      {user?.role === "ADMIN" ? (
        <Notice message="As an administrator, you can read and manage all workspace documents and team members." />
      ) : user?.grants.length ? (
        user.grants.map((g, i) => (
          <Row
            key={i}
            title={`${humanize(g.dept)} · ${humanize(g.type)}`}
            subtitle={g.actions.map(humanize).join(" · ")}
            icon="shield-checkmark-outline"
          />
        ))
      ) : (
        <Empty
          icon="lock-closed-outline"
          title="No document access yet"
          message="Ask an administrator to assign your team and document permissions."
        />
      )}
      <Text tone="secondary" size="small">
        Access is checked by your workspace. Sign in again after your
        administrator changes permissions.
      </Text>
    </Screen>
  );
}
