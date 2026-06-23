import Footer from '@/components/Footer'
import Header from '@/components/Header'

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
        title="Service BC Queue Management"
        titleAs="h1"
      />
      <main className="flex-1 p-4" id="main">
        <h2>App</h2>
      </main>
      <Footer />
    </div>
  )
}

export default App
