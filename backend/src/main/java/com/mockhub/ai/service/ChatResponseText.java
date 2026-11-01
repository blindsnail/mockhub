package com.mockhub.ai.service;

import java.util.stream.Collectors;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;

/**
 * Extracts the answer text from a {@link ChatResponse}.
 *
 * <p>Reasoning models return the thinking and the answer as separate generations. {@code ChatClient...content()}
 * reads only the first one, which is the thinking block, so the real answer is lost.
 */
public final class ChatResponseText {

    private ChatResponseText() {
    }

    public static String answerText(ChatResponse response) {
        if (response == null) {
            return null;
        }
        return response.getResults().stream()
                .map(Generation::getOutput)
                .filter(message -> !isThinking(message))
                .map(AssistantMessage::getText)
                .filter(text -> text != null && !text.isBlank())
                .collect(Collectors.joining("\n"));
    }

    // Thinking blocks carry a "signature", redacted ones carry "data" (see Spring AI Anthropic docs).
    private static boolean isThinking(AssistantMessage message) {
        return message.getMetadata().containsKey("signature") || message.getMetadata().containsKey("data");
    }
}
