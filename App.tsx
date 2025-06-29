import React, { useState, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import ChatScreen from './components/SetupScreen';
import ActivitiesScreen from './components/ActivitiesScreen';
import MemoryScreen from './components/MemoryScreen';
import TopNavBar from './components/TopNavBar';
import { ActivityChatScreen } from './components/ActivityChatScreen';
import { Message, Personality, ActiveView, Activity, Citation, Fact } from './types';
import * as geminiService from './services/geminiService';

const dataUriToGeminiPart = (uri: string) => {
    const match = uri.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('URI de dados inválida');
    }
    const mimeType = match[1].split(';')[0]; // Remove codecs etc. para compatibilidade
    return {
        inlineData: {
            mimeType: mimeType,
            data: match[2],
        },
    };
};


const App: React.FC = () => {
  const [personality, setPersonality] = useState<Personality>('amiga');
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [memoryFacts, setMemoryFacts] = useState<Fact[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState<boolean>(false);

  const initializeChat = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const chatInstance = geminiService.startChat({ personality: personality });
      setChat(chatInstance);
      setMessages([]); // Start with an empty chat
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao iniciar o chat. ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [personality]);
  
  useEffect(() => {
    initializeChat();
  }, [initializeChat]); 

  // Add initial greeting only when an empty chat is active
  useEffect(() => {
    if (activeView === 'chat' && messages.length === 0 && !isLoading) {
      const firstMessage: Message = {
        id: `gemini-${Date.now()}`,
        role: 'model',
        content: geminiService.getInitialGreeting(personality),
        timestamp: Date.now(),
      };
      setMessages([firstMessage]);
    }
  }, [activeView, messages.length, personality, isLoading]);


    useEffect(() => {
        const fetchFacts = async () => {
            if (activeView === 'memory' && messages.length > 1) {
                setIsLoadingFacts(true);
                try {
                    const facts = await geminiService.extractFactsFromHistory(messages);
                    setMemoryFacts(facts);
                } catch (error) {
                    console.error("Erro ao carregar fatos da memória:", error);
                    setMemoryFacts([]);
                } finally {
                    setIsLoadingFacts(false);
                }
            }
        };

        fetchFacts();
    }, [activeView, messages]);

  const handleSendMessage = useCallback(async (
    userInput: string, 
    image: string | null, 
    audio: { data: string; mimeType: string } | null,
    file: { data: string; mimeType: string; name: string } | null
  ) => {
    if (!chat || isLoading) return;

    if (!userInput.trim() && !image && !audio && !file) {
        return; // Não envia mensagens vazias
    }

    setIsLoading(true);
    setError(null);
    
    // If the chat is empty (or has only the initial greeting), clear it before adding the new user message.
    const newMessagesHistory = messages.length > 1 ? [...messages] : [];
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      image: image ?? undefined,
      audio: audio ? { data: audio.data, mimeType: audio.mimeType } : undefined,
      file: file ? { data: file.data, mimeType: file.mimeType, name: file.name } : undefined,
      timestamp: Date.now(),
    };
    
    setMessages([...newMessagesHistory, userMessage, { id: `gemini-${Date.now()}`, role: 'model', content: '', timestamp: Date.now() + 1 }]);

    try {
      const parts: any[] = [];
      
      if (image) parts.push(dataUriToGeminiPart(image));
      if (file) parts.push(dataUriToGeminiPart(file.data));
      if (audio) parts.push(dataUriToGeminiPart(audio.data));
      if (userInput.trim()) parts.push({ text: userInput });

      const stream = await chat.sendMessageStream({ message: parts });
      
      let fullResponse = "";
      let allCitations: Citation[] = [];
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
            const webChunks: Citation[] = groundingMetadata.groundingChunks
                .filter((c: any) => c.web && c.web.uri)
                .map((c: any) => c.web);
            allCitations.push(...webChunks);
        }

        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
                lastMessage.content = fullResponse;
                const uniqueCitations = [...new Map(allCitations.map(item => [item['uri'], item])).values()];
                lastMessage.citations = uniqueCitations;
            }
            return newMessages;
        });
      }

    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao enviar mensagem. ${message}`);
      console.error(e);
      setMessages(prev => prev.slice(0, -2)); // Remove user message and empty model message
    } finally {
      setIsLoading(false);
    }
  }, [chat, isLoading, messages]);
  
  const handleSelectActivity = (activity: Activity) => {
    setActiveActivity(activity);
    setActiveView('activities');
  };
  
  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return (
          <ChatScreen 
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              error={error}
          />
        );
      case 'activities':
        if (activeActivity) {
            return (
                <ActivityChatScreen
                    activity={activeActivity}
                    onClose={() => setActiveActivity(null)}
                />
            );
        }
        return <ActivitiesScreen onActivitySelect={handleSelectActivity} />;
      case 'memory':
        return <MemoryScreen facts={memoryFacts} isLoading={isLoadingFacts} />;
      default:
        return (
          <ChatScreen 
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              error={error}
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans relative">
      <TopNavBar 
        activeView={activeView} 
        onViewChange={setActiveView} 
      />
      <main className="transition-opacity duration-300">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
