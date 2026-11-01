package com.mockhub.ai.service;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ChatResponseTextTest {

    private static Generation text(String content) {
        return new Generation(new AssistantMessage(content));
    }

    private static Generation withMetadata(String content, String key) {
        return new Generation(AssistantMessage.builder()
                .content(content)
                .properties(Map.of(key, "x"))
                .build());
    }

    @Test
    @DisplayName("answerText - given thinking block before text block - returns only the text block")
    void answerText_givenThinkingThenText_returnsTextOnly() {
        ChatResponse response = new ChatResponse(List.of(
                withMetadata("We need answer only JSON array...", "signature"),
                text("[{\"eventId\": 1}]")));

        assertEquals("[{\"eventId\": 1}]", ChatResponseText.answerText(response));
    }

    @Test
    @DisplayName("answerText - given redacted thinking block - skips it")
    void answerText_givenRedactedThinking_skipsIt() {
        ChatResponse response = new ChatResponse(List.of(
                withMetadata("", "data"),
                text("answer")));

        assertEquals("answer", ChatResponseText.answerText(response));
    }

    @Test
    @DisplayName("answerText - given single text block - returns it")
    void answerText_givenSingleText_returnsIt() {
        assertEquals("hello", ChatResponseText.answerText(new ChatResponse(List.of(text("hello")))));
    }

    @Test
    @DisplayName("answerText - given only a thinking block - returns empty string")
    void answerText_givenOnlyThinking_returnsEmpty() {
        ChatResponse response = new ChatResponse(List.of(withMetadata("thinking only", "signature")));

        assertEquals("", ChatResponseText.answerText(response));
    }

    @Test
    @DisplayName("answerText - given null response - returns null")
    void answerText_givenNull_returnsNull() {
        assertNull(ChatResponseText.answerText(null));
    }
}
