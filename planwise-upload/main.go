package main

import (
	"context"
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	openai "github.com/sashabaranov/go-openai"
)

type AnalyzeRequest struct {
	Title string   `json:"title"`
	Steps []string `json:"steps"`
}

type Plan struct {
	ID        int       `json:"id"`
	Goal      string    `json:"goal"`
	Tasks     []string  `json:"tasks"`
	Feedback  string    `json:"feedback"`
	CreatedAt time.Time `json:"created_at"`
}

var db *sql.DB
var client *openai.Client

func main() {
	// Load env
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	openaiKey := os.Getenv("OPENAI_API_KEY")
	if dbURL == "" || openaiKey == "" {
		log.Fatal("Missing DATABASE_URL or OPENAI_API_KEY")
	}

	// Init DB
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("DB ping failed:", err)
	}

	// OpenAI
	client = openai.NewClient(openaiKey)

	// Gin setup
	router := gin.Default()
	router.Use(cors.Default())

	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	router.POST("/analyze", handleAnalyze)
	router.POST("/upload", handleUpload)
	router.GET("/plans", handleGetPlans)

	log.Println("🚀 PlanWise backend running on port", port)
	router.Run(":" + port)
}

// /analyze
func handleAnalyze(c *gin.Context) {
	var req AnalyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request JSON"})
		return
	}

	joinedSteps := ""
	for i, step := range req.Steps {
		joinedSteps += fmt.Sprintf("%d. %s\n", i+1, step)
	}

	prompt := fmt.Sprintf("Here is a weekly plan titled \"%s\" with steps:\n%s\n\nPlease provide suggestions to improve this plan in a numbered list.",
		req.Title, joinedSteps)

	resp, err := client.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4,
		Messages: []openai.ChatCompletionMessage{
			{Role: "system", Content: "You are a productivity expert helping improve weekly plans."},
			{Role: "user", Content: prompt},
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	suggestions := resp.Choices[0].Message.Content
	if err := savePlan(req.Title, req.Steps, suggestions); err != nil {
		log.Println("⚠️ Failed to save plan:", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"title":       req.Title,
		"steps":       req.Steps,
		"suggestions": suggestions,
	})
}

// /upload
func handleUpload(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing file"})
		return
	}
	defer file.Close()

	content, err := readText(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read file"})
		return
	}

	prompt := fmt.Sprintf("Here is a document:\n%s\n\nGive suggestions or a summary in a bullet list.", content)

	resp, err := client.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4,
		Messages: []openai.ChatCompletionMessage{
			{Role: "system", Content: "You're a helpful assistant summarizing and giving insights from user-uploaded documents."},
			{Role: "user", Content: prompt},
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": resp.Choices[0].Message.Content,
	})
}

// /plans
func handleGetPlans(c *gin.Context) {
	rows, err := db.Query(`
		SELECT id, goal, tasks, feedback, created_at
		FROM plans
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 20
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
		return
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var p Plan
		var tasksRaw string
		if err := rows.Scan(&p.ID, &p.Goal, &tasksRaw, &p.Feedback, &p.CreatedAt); err != nil {
			continue
		}
		p.Tasks = parseTaskArray(tasksRaw)
		plans = append(plans, p)
	}

	c.JSON(http.StatusOK, plans)
}

// Helpers
func savePlan(title string, steps []string, suggestions string) error {
	_, err := db.Exec(`
		INSERT INTO plans (goal, tasks, feedback, created_at)
		VALUES ($1, $2, $3, NOW())
	`, title, strings.Join(steps, ","), suggestions)
	return err
}

func parseTaskArray(s string) []string {
	if s == "" {
		return []string{}
	}
	return strings.Split(s, ",")
}

func readText(file multipart.File) (string, error) {
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
