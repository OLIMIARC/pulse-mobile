import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://YOUR_API_URL_HERE";

function msLeft(expiresAt) {
  return new Date(expiresAt).getTime() - Date.now();
}
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00";
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export default function App() {
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("ghost");

  async function ensureAnon() {
    const existing = await AsyncStorage.getItem("pulse_user_id");
    const res = await fetch(`${API}/v1/auth/anon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: existing || undefined })
    });
    const data = await res.json();
    await AsyncStorage.setItem("pulse_user_id", data.user_id);
    setUserId(data.user_id);
  }

  async function load() {
    const res = await fetch(`${API}/v1/status?limit=50`);
    const data = await res.json();
    setItems(data.items);
  }

  useEffect(() => {
    ensureAnon().then(load);
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  async function post() {
    if (!userId || !text.trim()) return;
    await fetch(`${API}/v1/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        content_type: "text",
        content: text,
        identity_mode: mode
      })
    });
    setText("");
    load();
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Pulse</Text>

      <View style={{ flexDirection: "row", gap: 8, marginVertical: 12 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Post a status…"
          style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 10 }}
        />
        <TouchableOpacity onPress={() => setMode(mode === "ghost" ? "known" : "ghost")}>
          <Text>{mode === "ghost" ? "👻" : "👤"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={post}>
          <Text>Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text>{item.content}</Text>
            <Text>👁 {item.views}</Text>
            <Text>⏳ {fmtCountdown(msLeft(item.expiresAt))}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
