import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Button, FlatList, StyleSheet, Dimensions } from 'react-native';
import Markdown from 'react-native-markdown-display';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    // Connect to WebSocket server
    ws.current = new WebSocket('ws://localhost:8080/ws');

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.current.onmessage = (e) => {
      const message = JSON.parse(e.data);
      setMessages(prevMessages => [...prevMessages, { text: message.text, user: false }]);
    };

    ws.current.onerror = (e) => {
      console.log('WebSocket error: ', e.message);
    };

    ws.current.onclose = (e) => {
      console.log('WebSocket closed: ', e.code, e.reason);
    };

    return () => {
      ws.current.close();
    };
  }, []);

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    setMessages(prevMessages => [...prevMessages, { text: inputText, user: true }]);
    ws.current.send(JSON.stringify({ text: inputText }));
    setInputText('');
  };

  const renderMessage = ({ item }) => (
    <View style={item.user ? styles.userMessage : styles.aiMessage}>
      {item.user ? (
        <Markdown style={markdownStyles}>{item.text}</Markdown>
      ) : (
        <Markdown style={markdownStyles}>{item.text}</Markdown>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: width * 0.8,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: width * 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 14,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paragraph: {
    marginVertical: 8,
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listItemNumber: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  listItemBullet: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  codeBlock: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
});
