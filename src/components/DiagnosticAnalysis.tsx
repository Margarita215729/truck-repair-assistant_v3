import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function DiagnosticAnalysis() {
  console.log('🔧 DiagnosticAnalysis component loaded');

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, text: string, type: 'user' | 'ai'}>> [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      type: 'user' as const
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: `✅ Received: "${userMessage.text}". This is a simulated AI response. The full functionality will be implemented soon!`,
        type: 'ai' as const
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#22c55e', marginBottom: '20px' }}>🚀 Diagnostic Analysis Test</h2>
      
      {/* Messages */}
      <div style={{ 
        height: '400px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '15px', 
        marginBottom: '20px', 
        overflowY: 'auto', 
        background: '#f9fafb' 
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '150px' }}>
            <p>💬 Начните чат, введя сообщение ниже</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ 
              marginBottom: '15px', 
              textAlign: msg.type === 'user' ? 'right' : 'left' 
            }}>
              <div style={{ 
                display: 'inline-block', 
                padding: '10px 15px', 
                borderRadius: '12px', 
                maxWidth: '70%', 
                background: msg.type === 'user' ? '#3b82f6' : '#10b981',
                color: 'white' 
              }}>
                <strong>{msg.type === 'user' ? '👤 You:' : '🤖 AI:'}</strong> {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <Input
          type="text"
          placeholder="Describe your truck problem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ 
            flex: 1, 
            padding: '12px', 
            border: '2px solid #d1d5db', 
            borderRadius: '8px', 
            fontSize: '16px' 
          }}
        />
        <Button
          type="submit"
          style={{ 
            padding: '12px 24px', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '16px' 
          }}
        >
          Send
        </Button>
      </form>

      {/* Debug Info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#f0f9ff', 
        borderRadius: '8px', 
        fontSize: '14px' 
      }}>
        <h4>🔍 Debug Info:</h4>
        <p>✅ Component loaded successfully</p>
        <p>📨 Messages count: {messages.length}</p>
        <p>⏰ Last update: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
