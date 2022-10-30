package main

import (
	"github.com/gin-gonic/gin"
	"encoding/json"
	"crypto/sha256"
	"net/http"
	"strconv"
	"strings"
	"time"
	"fmt"
)

type Block struct {
	data map[string]interface{}
	hash string
	prev_hash string
	timestamp time.Time
	pow int
}

type Blockchain struct {
	origin Block
	chain []Block
}

func (b Block) calc_hash() string {
	data, _ := json.Marshal(b.data)
	block_data := b.prev_hash + string(data) + b.timestamp.String() + strconv.Itoa(b.pow)
	block_hash := sha256.Sum256([]byte(block_data))
	return fmt.Sprintf("%x", block_hash)
}

func (b *Block) mine(difficulty int) {
	for !strings.HasPrefix(b.hash, strings.Repeat("0", difficulty)) {
		b.pow++
		b.hash = b.calc_hash()
		// fmt.Println(b.hash)
	}
}

func create_blockchain() Blockchain {
	origin := Block {
		hash: "0",
		timestamp: time.Now(),
	}
	return Blockchain {
		origin,
		[]Block{origin},
	}
}

func (b *Blockchain) add_block(ip string, amount int, difficulty int) string {
	block_data := map[string]interface{}{
		"ip": ip,
		"spending": amount,
	}
	last_block := b.chain[len(b.chain)-1]
	new_block := Block {
		data: block_data,
		prev_hash: last_block.hash,
		timestamp: time.Now(),
	}
	new_block.mine(difficulty)
	b.chain = append(b.chain, new_block)
	return new_block.hash
}


func (b Blockchain) is_valid() bool {
	for i := range b.chain[1:] {
		prev_block := b.chain[i]
		current_block := b.chain[i+1]
		if current_block.hash != current_block.calc_hash() || current_block.prev_hash != prev_block.hash {
				return false
		}
	}
	return true
}

func (b Blockchain) coin_count(ip string) int {
	res := 0
	for i := range b.chain[:] {
		if b.chain[i].data["ip"] == ip {
			if b.chain[i].data["spending"].(int) == 0 {
				res++
			} else {
				res -= b.chain[i].data["spending"].(int)
			}
		}
	}
	return res
}

func main() {
	blockchain := create_blockchain()

	fmt.Println(blockchain.is_valid())

	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H {
			"hash": blockchain.add_block(c.ClientIP(), 0, 5),
			"coins": blockchain.coin_count(c.ClientIP()),
		})
	})
	r.GET("/:id/:difficulty", func(c *gin.Context) {
		difficulty, _ := strconv.Atoi(c.Param("difficulty"))
		c.JSON(http.StatusOK, gin.H {
			"hash": blockchain.add_block(c.ClientIP(), 0, difficulty),
			"coins": blockchain.coin_count(c.ClientIP()),
		})
	})
	r.GET("/:id/:difficulty/:amount", func(c *gin.Context) {
		amount, _ := strconv.Atoi(c.Param("amount"))
		difficulty, _ := strconv.Atoi(c.Param("difficulty"))
		c.JSON(http.StatusOK, gin.H {
			"hash": blockchain.add_block(c.ClientIP(), amount, difficulty),
			"coins": blockchain.coin_count(c.ClientIP()),
		})
	})
	
	r.Run() // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}