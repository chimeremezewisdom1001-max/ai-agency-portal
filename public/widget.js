(function () {
  const targetSubdomain = document.currentScript.getAttribute('data-subdomain') || 'default';
  
  const apiEndpoint = window.location.origin === 'null' || window.location.protocol === 'file:' 
    ? 'http://localhost:3000/api/chat' 
    : `${window.location.origin}/api/chat`;

  const style = document.createElement('style');
  style.innerHTML = `
    #ai-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif; }
    #ai-chat-btn { background: #2563eb; color: white; border: none; padding: 12px 16px; border-radius: 50px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    #ai-chat-box { display: none; width: 300px; height: 400px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; flex-direction: column; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
    #ai-messages { flex: 1; padding: 10px; overflow-y: auto; font-size: 14px; }
    #ai-input-container { display: flex; border-top: 1px solid #e5e7eb; }
    #ai-input { flex: 1; border: none; padding: 10px; outline: none; }
    #ai-send { background: #2563eb; color: white; border: none; padding: 10px; cursor: pointer; }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  container.innerHTML = `
    <button id="ai-chat-btn">💬 Chat</button>
    <div id="ai-chat-box">
      <div id="ai-messages"></div>
      <div id="ai-input-container">
        <input type="text" id="ai-input" placeholder="Type a message..." />
        <button id="ai-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById('ai-chat-btn');
  const box = document.getElementById('ai-chat-box');
  btn.onclick = () => {
    box.style.display = box.style.display === 'none' || box.style.display === '' ? 'flex' : 'none';
  };

  const sendBtn = document.getElementById('ai-send');
  const input = document.getElementById('ai-input');
  const messagesDiv = document.getElementById('ai-messages');

  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;

    appendMessage('You', text);
    input.value = '';

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, subdomain: targetSubdomain })
      });
      const data = await res.json();
      appendMessage('AI', data.reply);
    } catch (err) {
      appendMessage('System', 'Cannot connect to server.');
    }
  };

  function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    msg.style.marginBottom = '8px';
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
})();
