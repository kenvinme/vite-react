import './App.css'
import ChatWidget from './components/ChatWidget'

function App() {
  return (
    <div>
      <h1>Yumzyfood</h1>
      <p>Trang demo kết nối chatbot YumzyBot.</p>

      {/* Chatbot YumzyBot góc dưới bên phải */}
      <ChatWidget />
    </div>
  )
}

export default App
