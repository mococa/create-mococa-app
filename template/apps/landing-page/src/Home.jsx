import Nullstack from 'nullstack';

class Home extends Nullstack {
  render() {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            Welcome to {{PROJECT_NAME}}
          </h1>
          <p class="text-lg text-gray-600">
            Start building your app by editing <code class="bg-gray-200 px-2 py-1 rounded">src/Home.jsx</code>
          </p>
        </div>
      </div>
    );
  }
}

export default Home;
