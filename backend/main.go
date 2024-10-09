package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "net/url"

    "github.com/gorilla/websocket"
    "github.com/ollama/ollama/api"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin:     func(r *http.Request) bool { return true },
}

type Message struct {
    Text  string `json:"text"`
    Model string `json:"model,omitempty"`
}

var ollamaClient *api.Client
const defaultModel = "llama3.1:8b"

const systemPrompt = "You are an AI assistant specializing in flight-related discussions. Your primary function is to provide information, answer questions, and engage in conversations exclusively about air travel, airlines, airports, and other flight-related topics. Please politely redirect any non-flight-related queries back to flight discussions."


func initOllama() error {
    ollamaURL, err := url.Parse("http://localhost:11434")
    if err != nil {
        return fmt.Errorf("failed to parse Ollama URL: %v", err)
    }
    ollamaClient = api.NewClient(ollamaURL, http.DefaultClient)
    return nil
}

func generateOllamaResponse(input string, model string) (string, error) {
    if model == "" {
        model = defaultModel
    }
    
    var fullResponse string
    err := ollamaClient.Generate(context.Background(), &api.GenerateRequest{
        Model:  model,
        Prompt: input,
        System: systemPrompt,
    }, func(response api.GenerateResponse) error {
        fullResponse += response.Response
        return nil
    })
    if err != nil {
        return "", fmt.Errorf("failed to generate Ollama response: %v", err)
    }
    return fullResponse, nil
}

func reader(conn *websocket.Conn) {
    for {
        _, p, err := conn.ReadMessage()
        if err != nil {
            log.Println(err)
            return
        }
        var msg Message
        err = json.Unmarshal(p, &msg)
        if err != nil {
            log.Println("Error parsing JSON:", err)
            continue
        }
        fmt.Printf("Received message: %s (Model: %s)\n", msg.Text, msg.Model)

        ollamaResponse, err := generateOllamaResponse(msg.Text, msg.Model)
        if err != nil {
            log.Println(err)
            continue
        }

        response := Message{Text: ollamaResponse, Model: msg.Model}
        err = conn.WriteJSON(response)
        if err != nil {
            log.Println(err)
            return
        }
    }
}

func serveWs(w http.ResponseWriter, r *http.Request) {
    fmt.Println(r.Host)
    ws, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
    }
    reader(ws)
}

func setupRoutes() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Simple Server")
    })
    http.HandleFunc("/ws", serveWs)
}

func main() {
    fmt.Println("Chat App v0.06 with Ollama (Default: LLAMA 8B)")
    
    err := initOllama()
    if err != nil {
        log.Fatal(err)
    }
    
    setupRoutes()
    http.ListenAndServe(":8080", nil)
}
