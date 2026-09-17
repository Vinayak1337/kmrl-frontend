import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { api } from "../src/api";
import { useApp } from "../src/store";
import { useTheme } from "../src/theme";
import {
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  Row,
  Text,
} from "../src/ui";
export default function People() {
  const router = useRouter();
  const demo = useApp((s) => s.session?.demo);
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["people"],
    queryFn: ({ signal }) => api.people(signal),
    enabled: !demo,
  });
  const people =
    query.data?.users.filter((p) =>
      `${p.name} ${p.email}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlashList
        data={people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 24 }}
        onRefresh={() => {
          if (!demo) void query.refetch();
        }}
        refreshing={query.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingBottom: 16 }}>
            <Text size="title">People</Text>
            <Field
              label="Find a person"
              value={search}
              onChangeText={setSearch}
              placeholder="Name or email"
              autoCapitalize="none"
            />
            {demo ? (
              <Notice message="People management is available in a live administrator account." />
            ) : (
              <Button
                label="Add person"
                icon="person-add-outline"
                onPress={() => router.push("/person")}
              />
            )}
            {query.error && (
              <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Row
            title={item.name}
            subtitle={`${item.email}\n${item.role === "ADMIN" ? "Administrator" : "Manager"}`}
            icon="person-circle-outline"
            onPress={() =>
              router.push({ pathname: "/person", params: { id: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          !demo && query.isPending ? (
            <Loading />
          ) : !demo && !query.error ? (
            <Empty
              icon="people-outline"
              title="No people found"
              message="Try another name or add a team member."
            />
          ) : null
        }
      />
    </View>
  );
}
