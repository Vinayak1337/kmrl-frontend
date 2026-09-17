import { useEffect, useState } from "react";
import { View, Switch } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, queryClient } from "../src/api";
import { useApp } from "../src/store";
import { docTypes, teams, humanize, type Grant } from "../src/domain";
import {
  Button,
  confirm,
  ErrorState,
  Field,
  Loading,
  Notice,
  Picker,
  Row,
  Screen,
  Text,
  success,
} from "../src/ui";
export default function Person() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const ownId = useApp((s) => s.session?.user.sub);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [team, setTeam] = useState("OPERATIONS");
  const [grantType, setGrantType] = useState("policy");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const query = useQuery({
    queryKey: ["person", id],
    queryFn: ({ signal }) => api.person(id!, signal),
    enabled: !!id,
  });
  useEffect(() => {
    if (query.data) {
      const p = query.data.user;
      setName(p.name);
      setEmail(p.email);
      setRole(p.role);
      setTeam(p.department || "OPERATIONS");
      setGrants(p.grants || []);
    }
  }, [query.data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new Error("Enter a name and valid email.");
      if ((!id || password) && password.length < 8)
        throw new Error("Use a password with at least 8 characters.");
      if (id === ownId && role !== "ADMIN")
        throw new Error(
          "You cannot remove your own administrator access here.",
        );
      return api.savePerson(
        {
          name: name.trim(),
          email: email.trim(),
          password: password || undefined,
          role,
          department: team,
          grants: role === "ADMIN" ? [] : grants,
        },
        id,
      );
    },
    onSuccess: () => {
      setDone(true);
      success();
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      void queryClient.invalidateQueries({ queryKey: ["person", id] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deletePerson(id!),
    onSuccess: () => {
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      setTimeout(() => router.back(), 0);
    },
  });
  usePreventRemove(!!ownId && dirty && !done, ({ data }) => {
    if (!save.isPending && !remove.isPending)
      void confirm(
        "Discard changes?",
        "Your changes have not been saved.",
        "Discard",
      ).then((ok) => {
        if (ok) navigation.dispatch(data.action);
      });
  });
  function change<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setDirty(true);
  }
  function toggleGrant(action: string, enabled: boolean) {
    setDirty(true);
    setGrants((current) => {
      const match = current.find(
        (g) => g.dept === team && g.type.toLowerCase() === grantType,
      );
      const actions = new Set(match?.actions || []);
      if (enabled) actions.add(action);
      else actions.delete(action);
      return [
        ...current.filter(
          (g) => !(g.dept === team && g.type.toLowerCase() === grantType),
        ),
        ...(actions.size
          ? [
              {
                dept: team,
                type: grantType.toUpperCase(),
                actions: [...actions],
              },
            ]
          : []),
      ];
    });
  }
  if (id && query.isPending)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (query.error)
    return (
      <Screen>
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </Screen>
    );
  if (done)
    return (
      <Screen>
        <Notice message="Team member saved." />
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen>
      <Text size="title">{id ? "Edit person" : "Add person"}</Text>
      <Field
        label="Name"
        value={name}
        onChangeText={(v) => change(setName, v)}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={(v) => change(setEmail, v)}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label={id ? "New password (optional)" : "Password"}
        value={password}
        onChangeText={(v) => change(setPassword, v)}
        secureTextEntry
        autoComplete="new-password"
      />
      <Picker
        label="Role"
        value={role}
        options={[
          { label: "Manager", value: "MANAGER" },
          { label: "Administrator", value: "ADMIN" },
        ]}
        onChange={(v) => change(setRole, v as typeof role)}
      />
      <Picker
        label="Team"
        value={team}
        options={teams.map((v) => ({ value: v, label: humanize(v) }))}
        onChange={(v) => change(setTeam, v)}
      />
      {role === "MANAGER" && (
        <View style={{ gap: 12 }}>
          <Text size="heading">Document access</Text>
          <Picker
            label="Document type"
            value={grantType}
            options={docTypes.map((v) => ({ value: v, label: humanize(v) }))}
            onChange={setGrantType}
          />
          {["read", "ingest", "approve"].map((action) => (
            <Row
              key={action}
              title={humanize(action)}
              trailing={
                <Switch
                  accessibilityLabel={`${humanize(action)} ${humanize(grantType)} in ${humanize(team)}`}
                  value={
                    !!grants
                      .find(
                        (g) =>
                          g.dept === team && g.type.toLowerCase() === grantType,
                      )
                      ?.actions.includes(action)
                  }
                  onValueChange={(value) => toggleGrant(action, value)}
                />
              }
            />
          ))}
          {grants.map((g, i) => (
            <Text key={i} size="small" tone="secondary">
              {humanize(g.dept)} · {humanize(g.type)}: {g.actions.join(", ")}
            </Text>
          ))}
        </View>
      )}
      {(save.error || remove.error) && (
        <ErrorState error={save.error || remove.error} />
      )}
      <Button
        label="Save person"
        busy={save.isPending}
        disabled={remove.isPending}
        onPress={() => save.mutate()}
      />
      {id && id !== ownId && (
        <Button
          kind="danger"
          label="Remove person"
          busy={remove.isPending}
          disabled={save.isPending}
          onPress={() =>
            void confirm(
              "Remove person?",
              `${name} will lose access to this workspace.`,
            ).then((ok) => {
              if (ok) remove.mutate();
            })
          }
        />
      )}
    </Screen>
  );
}
