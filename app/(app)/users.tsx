import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/config/supabase";

interface User {
  id: string;
  name: string;
  phone: string;
  address: string;
  profilePicture: string | null;
}

interface Message {
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    const initializeRealtime = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        Alert.alert("Error fetching user", userError.message);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(`id, name, phone, address, profilePicture`)
        .eq("id", user?.id)
        .single();

      if (error) {
        Alert.alert("Error fetching profile", error.message);
        return;
      }

      const current = {
        id: data.id,
        name: data.name || "Unknown",
        phone: data.phone || "No phone available",
        address: data.address || "No address available",
        profilePicture: data.profilePicture || null,
      };

      setCurrentUser(current);

      const messageSubscription = supabase
        .channel("messages-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${current.id}`,
          },
          (payload) => {
            const newMessage: Message = payload.new;
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    };

    initializeRealtime();
  }, []);

  const fetchUsers = async (query: string = "") => {
    try {
      setLoading(true);

      if (!currentUser) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from("profiles")
        .select(`id, name, phone, address, profilePicture`)
        .neq("id", currentUser.id)
        .ilike("name", `%${query}%`);

      if (error) throw error;

      const transformedUsers = data.map((user: any) => ({
        id: user.id,
        name: user.name || "Unknown",
        phone: user.phone || "No phone available",
        address: user.address || "No address available",
        profilePicture: user.profilePicture || null,
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      Alert.alert("Error fetching users", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchUsers(text);
  };

const handleMessage = (user: User) => {
    setSelectedUser(user);
    setMessages([]);
    setIsChatVisible(true);
    fetchMessages(user.id);
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser?.id}, receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId}, receiver_id.eq.${currentUser?.id})`
        )
        .order("timestamp", { ascending: true });

      if (error) throw error;

      setMessages(data);
    } catch (error: any) {
      Alert.alert("Error fetching messages", error.message);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    if (!currentUser || !selectedUser) {
      Alert.alert("Error", "No user selected.");
      return;
    }

    const newMessage = {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("messages").insert(newMessage);
      if (error) throw error;

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessageInput("");
    } catch (error: any) {
      Alert.alert("Error sending message", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search users by name..."
        value={search}
        onChangeText={handleSearch}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#9455f4" />
          <Text>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
                  {item.profilePicture ? (
              <Image
                source={{ uri: item.profilePicture }}
              />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Text style={styles.defaultProfileText}>{item.name.charAt(0)}</Text>
              </View>
            )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text>Address: {item.address}</Text>
                <Text>Phone: {item.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => handleMessage(item)}
              >
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.noResults}>No users found.</Text>}
        />
      )}

      <Modal
        visible={isChatVisible}
        animationType="slide"
        onRequestClose={() => setIsChatVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.chatContainer}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setIsChatVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Chat with {selectedUser?.name}</Text>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item, index) => `${item.sender_id}-${index}`}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.sender_id === currentUser?.id
                    ? styles.sentBubble
                    : styles.receivedBubble,
                ]}
              >
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
          />

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={messageInput}
              onChangeText={setMessageInput}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafc",
  },
  searchBar: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  messageButton: {
    backgroundColor: "#9455f4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResults: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
  },
  // Chat Modal Styles
  chatContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  closeButton: {
    color: "#9455f4",
    fontSize: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
  },
  sentBubble: {
    backgroundColor: "#bfa6f7",
    alignSelf: "flex-end",
  },
  receivedBubble: {
    backgroundColor: "#f1f0f0",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: "#555",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  messageInputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopColor: "#ddd",
    borderTopWidth: 1,
    backgroundColor: "#f9fafc",
  },
  messageInput: {
    flex: 1,
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#9455f4",
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  defaultProfilePicture: {
    width: 70,
    height: 70,
    borderRadius: 100,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  defaultProfileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  }
});
