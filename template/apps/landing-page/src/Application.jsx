import Nullstack from 'nullstack';
import '../tailwind.css';
import Home from './Home';

class Application extends Nullstack {
  prepare({ page }) {
    page.locale = 'en-US';
  }

  render() {
    return (
      <main>
        <Home route="/" />
      </main>
    );
  }
}

export default Application;
