import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "../src/ChatScreen";
export default function Conversation() {
  const { docId, title } = useLocalSearchParams<{
    docId: string;
    title?: string;
  }>();
  return <ChatScreen key={docId} docId={docId} title={title} />;
}
