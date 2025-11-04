### Nullstack Overview

**Nullstack** is a JavaScript framework that uses **JSX** but with its own conventions and runtime behavior.

**Documentation**: https://nullstack.app

#### Core Differences from React

- Uses `class` instead of `className`.
- The `style` attribute accepts a **string or array of strings**, not an object.
- HTML properties use **standard HTML casing**, not camelCase.
- JSX supports **stateful and stateless components**:
  - **Stateless** → simple functions that return JSX.
  - **Stateful** → classes that extend `Nullstack`.
- **Fragments** → Use `<></>` shorthand to group elements without a wrapper (same as React):
  ```jsx
  render() {
    return (
      <>
        <Header />
        <Main />
        <Footer />
      </>
    );
  }
  ```

#### Reactivity

Reactivity happens automatically when a property of a `Nullstack` class changes.
Any JSX referencing that property will re-render.

**Note**: Unlike React, there's no need to worry about unnecessary re-renders or optimization patterns like `useMemo`/`useCallback`.

#### Event Handlers

All event handlers are **bound objects** from the instantiated Nullstack class.
Events are **prevented by default**, and the event is passed as `{ event }`.

**IMPORTANT - Event Handler Syntax:**

❌ **WRONG** - Don't use React-style `(e) =>` or `(event) =>`:
```jsx
// ❌ WRONG - This is React syntax, not Nullstack
<input onchange={(e) => this.value = e.target.value} />
<select onchange={(event) => this.selected = event.target.value} />
```

✅ **CORRECT** - Use `{ event }` destructuring if you need the event:
```jsx
// ✅ CORRECT - Nullstack passes event as an object property
<input onchange={({ event }) => this.value = event.target.value} />
<select onchange={({ event }) => this.selected = event.target.value} />
```

✅ **BEST** - Use two-way binding with `bind` (no event handling needed):
```jsx
// ✅ BEST - Use bind for simple input binding
<input bind={this.value} />
<select bind={this.selected} />
```

**Key Rules:**
- Events in Nullstack are passed as an **object** with an `event` property
- Always destructure: `{ event }` not `(e)` or `(event)`
- Prefer using `bind` for form inputs (cleaner and more idiomatic)
- Event properties: `event.target.value`, `event.target.files`, etc.

#### Two-Way Binding

Inputs and other form elements support two-way data binding with the `bind` attribute:

```jsx
<input bind={this.name} />
<select bind={this.selectedOption} />
<textarea bind={this.description} />
```

**This is the preferred way to handle form inputs in Nullstack.** It automatically:
- Updates the component property when the input changes
- Updates the input value when the property changes
- Works with all standard form elements (input, select, textarea)

Here, `this` refers to a class that extends `Nullstack`, and `name` is a defined property.

#### Structure and Entry Point

The entry point is **`Application.jsx`** (or `.tsx`), imported in both `client.js` and `server.js`.
It is a stateful component (class extending `Nullstack`) that renders route-based pages:

```jsx
<main>
  <Home route="/" />
  <About route="/about" />
</main>
```

**Head Management** - You can inject content into the `<head>` tag using a `renderHead()` method:

```jsx
class Application extends Nullstack {
  renderHead() {
    return (
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      </head>
    );
  }

  render() {
    return (
      <main>
        <Head />  {/* Self-closing component renders the head content */}
        <Home route="/" />
        <About route="/about" />
      </main>
    );
  }
}
```

**Note**: `<Head />` is a self-closing component that renders the content from `renderHead()`. This is useful for managing meta tags, fonts, scripts, and other head elements.

#### Routing and Navigation

**Routes** - Any element can receive a `route` attribute:

```jsx
<Home route="/" />
<Page route="/page" />
<section route="/about"> About content </section>
```

**Links** - Use standard `<a>` tags with `href` starting with `/`:

```jsx
<a href="/about">About</a>
```

On client-side, links push history without reloading. External links (not starting with `/`) work normally.

**Special link attributes**:
- `path` - Changes path keeping query params: `<a path="/about">About</a>`
- `params` - Updates params keeping path: `<a params={{page: 1}}>First Page</a>`
- Both can be combined: `<a path="/books" params={{page: 1}}>Books</a>`

**Dynamic segments** - Use `:param` syntax:

```jsx
<Books route="/category/:slug" />
// URL: /category/suspense
// Access via: params.slug === 'suspense'
```

**Wildcards** - Use `*` to match anything:

```jsx
<Home route="/" />
<BlogEngine route="/blog/*" />
<NotFound route="*" />
```

**Router context** - Available in all methods (client-side only):

```jsx
prepare({ router }) {
  router.url;      // Full URL with query params
  router.path;     // Path only (no query params)
  router.base;     // Base URL (e.g., https://nullstack.app)
  router.previous; // Previous route URL (null on first visit)

  // Client-side navigation
  router.path = '/dashboard';        // Route change (SPA navigation)
  router.url = 'https://external';   // Full reload (external URL)
}
```

**IMPORTANT - Programmatic Navigation:**

To navigate programmatically in Nullstack, you **must** extract the `router` from the method parameters and use `router.path`:

```jsx
class MyComponent extends Nullstack {
  // ❌ WRONG - Using window.location.href (causes full page reload)
  handleClick() {
    window.location.href = '/dashboard';
  }

  // ✅ CORRECT - Extract router from parameters and use router.path
  handleClick({ router }) {
    router.path = '/dashboard';  // SPA navigation, no reload
  }

  // ✅ CORRECT - In render method, pass router to handler
  render({ router }) {
    return (
      <button onclick={() => router.path = '/dashboard'}>
        Navigate
      </button>
    );
  }

  // ✅ CORRECT - Access router in any method
  async someMethod({ router, instances }) {
    await this.doSomething();
    router.path = '/success';  // Navigate after async operation
  }
}
```

**Key Rules for Navigation:**
- Always extract `router` from the method's object parameter
- Use `router.path = '/path'` for SPA navigation (no page reload)
- Use `router.url = 'url'` only for external URLs (triggers full reload)
- Never use `window.location.href` for internal navigation

**Params context** - Query string parameters:

```jsx
// URL: /books?expanded=true&page=2
initiate({ params }) {
  params.expanded; // true (boolean)
  params.page;     // "2" (string)

  // Update params (triggers redirect)
  params.page = 3;
  params.filter = ''; // Empty string removes param
}
```

**Route instances** - By default, components with routes use the current URL as key and reinstantiate on param changes. Override with custom `key`:

```jsx
<Page route="/page/:slug" key="page" /> {/* Won't reinstantiate */}
<Page route="/page/:slug" key={router.path} /> {/* Reinstantiates on path change only */}
```

#### Lifecycle Methods

Nullstack provides several lifecycle methods. **ALL methods receive context as their single parameter** which you destructure:

- **`prepare(context)`** - Runs on **server-side on first load**, then on **client-side on navigation**. Use for SEO, initial data fetching.
  - Example: `prepare({ page, params, environment }) { ... }`
  - Common context properties: `page`, `params`, `environment`, `settings`, `project`
  - On client navigation, has access to: `router`, `instances`

- **`initiate(context)`** - Runs on **client-side only** after component mounts.
  - Example: `async initiate({ instances, router, params }) { ... }`
  - Full client context available: `router`, `instances`, `params`, etc.

- **`hydrate(context)`** - Runs on **client-side only** when hydrating server-rendered content (first page load).
  - Example: `hydrate({ instances, router }) { ... }`
  - This is the first client-side lifecycle method, runs before `initiate()`

- **`render(context)`** - Renders the component JSX.
  - Example: `render({ router, instances, params }) { ... }`
  - Full context available

**Key Context Properties:**
- `environment` - Object with `client`, `server`, `development`, `production` (all booleans)
- `page` - Page metadata (title, description, locale, etc.)
- `router` - Routing information (path, url, base, previous) - client-side only
- `instances` - All mounted instances - client-side only
- `params` - Route and query parameters
- `project` - Project configuration
- `settings` - Application settings
- `worker` - Service worker integration

#### Method Rules

**CRITICAL - ALL methods in Nullstack classes receive context as their single parameter:**

In stateful components (classes extending `Nullstack`):

* **ALL methods receive context** - Nullstack automatically injects context into every method call
* **ALWAYS destructure the parameter** - Extract what you need: `methodName({ router, instances, params })`
* **Context is automatically injected** - You never need to manually pass `instances`, `router`, etc. between methods
* **Syntax**: `methodName(context)` where you destructure: `methodName({ prop1, prop2 })`

**❌ WRONG - Methods without context parameter:**

```jsx
class MyComponent extends Nullstack {
  // ❌ WRONG - No parameter (method won't receive context)
  myMethod() {
    router.path = '/somewhere';  // Error: router is not defined
  }

  // ❌ WRONG - Utility function disguised as a method
  formatDate(date) {
    return new Date(date).toLocaleDateString();
  }

  // ❌ WRONG - Helper method without context
  calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
  }
}
```

**✅ CORRECT - Use utility functions outside the class:**

```jsx
// ✅ CORRECT - Utility functions outside the class (bottom of file)
function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

class MyComponent extends Nullstack {
  // ✅ CORRECT - Methods that need context use it
  async loadData({ instances, router }) {
    const data = await fetchData();
    instances.app.showSuccess({ message: 'Loaded!' });
  }

  // ✅ CORRECT - Use utility functions in methods
  render({ instances }) {
    const total = calculateTotal(this.items);
    const formattedDate = formatDate(this.date);

    return <div>{formattedDate}: ${total}</div>;
  }
}

export default MyComponent;
```

**Key Rule:** If a function doesn't use Nullstack context (`instances`, `router`, `params`, etc.), it should **NOT** be a class method. Define it as a regular function outside the class.

Context properties available in methods:
  - `instances` - Access to all mounted instances (client-side)
  - `router` - Routing information (client-side)
  - `params` - Route parameters
  - `page` - Page metadata (title, description, etc.)
  - `environment` - Environment flags (client, server, development, production)
  - `project` - Project configuration
  - `worker` - Service worker integration
  - `settings` - Application settings

**IMPORTANT - Accessing Context in Methods:**

Nullstack methods receive context as a destructured object parameter. You must explicitly extract what you need:

```jsx
class MyComponent extends Nullstack {
  // ❌ WRONG - No parameter destructuring
  async handleSubmit() {
    // router is not accessible!
    router.path = '/success';  // Error: router is not defined
  }

  // ✅ CORRECT - Destructure context to access router, instances, etc.
  async handleSubmit({ router, instances }) {
    // Now router and instances are accessible
    await this.saveData();
    instances.app.showSuccess({ message: 'Saved!' });
    router.path = '/success';
  }

  // ✅ CORRECT - Access multiple context properties
  async loadData({ params, instances, router }) {
    const id = params.id;  // From URL params
    const data = await this.fetchData(id);

    if (!data) {
      instances.app.showError({ message: 'Not found' });
      router.path = '/404';
      return;
    }

    this.data = data;
  }

  // ✅ CORRECT - In render, extract what you need
  render({ router, instances, params }) {
    return (
      <div>
        <h1>{params.title}</h1>
        <button onclick={() => router.path = '/back'}>Back</button>
        <p>{instances.auth.user?.name}</p>
      </div>
    );
  }
}
```

**Key Rules for Methods:**
- **ALWAYS use named parameters (object destructuring)** for ALL methods: `methodName({ router, instances, params })`
- Extract only what you need from the context object
- Context is **automatically injected by Nullstack** into ALL methods - never manually pass `instances`, `router`, etc.
- When calling methods, pass only custom parameters: `this.loadData({ id: 5 })` - context is injected automatically
- Context is available in **all** methods: `render`, `hydrate`, `initiate`, `prepare`, and custom methods
- Instance methods defined in Instance classes also receive context automatically: `myMethod({ router, instances })`

**Examples of Automatic Context Injection:**

```jsx
class MyComponent extends Nullstack {
  // ❌ WRONG - Manually passing instances
  async handleClick({ instances }) {
    await this.saveData({ instances });  // DON'T DO THIS
  }

  async saveData({ instances }) {
    instances.app.showSuccess({ message: 'Saved!' });
  }

  // ✅ CORRECT - Context injected automatically
  async handleClick() {
    await this.saveData({ id: 5 });  // Only pass custom params
  }

  async saveData({ id, instances }) {  // instances automatically available
    const data = await this.fetchData(id);
    instances.app.showSuccess({ message: 'Saved!' });
  }

  // ✅ CORRECT - Calling instance methods
  async handleSubmit({ instances }) {
    // Nullstack automatically injects context into instance methods
    await instances.data.loadCompanies({ admin: false });  // Only pass custom params
  }

  // ✅ CORRECT - Instance method receives context automatically
  async loadCompanies({ admin, instances }) {  // Both custom param and context available
    const endpoint = admin ? sdk.api.admin.companies : sdk.api.companies;
    await endpoint.get();
  }
}
```

**Key Takeaway:** Nullstack automatically injects context (`instances`, `router`, `params`, etc.) into every method call. You only need to pass custom parameters.

#### Instances (Shared State & Logic)

Nullstack supports **instances** for managing shared state and logic across components (similar to React Context):

```jsx
// Define an instance component (holds state and methods)
class MyInstance extends Nullstack {
  myStateHere = 'value';

  myMethodHere() {
    console.log(this.myStateHere);
  }

  myOtherMethodHere() {
    this.myStateHere += ' updated';
  }
}

// Mount instance in Application with a key and persistent flag
class Application extends Nullstack {
  render() {
    return (
      <div>
        <MyInstance key="hey" persistent />
        <Home route="/" />
      </div>
    );
  }
}

// Access instance from any component or method via { instances }
class Home extends Nullstack {
  // Available in render methods
  render({ instances }) {
    return (
      <div>
        <h1>Home</h1>
        <button onclick={instances.hey.myMethodHere}>myMethodHere</button>
        <button onclick={instances.hey.myOtherMethodHere}>myOtherMethodHere</button>
      </div>
    );
  }

  // Also available in all other methods
  async someMethod({ instances }) {
    instances.hey.myMethodHere();
  }
}
```

**Key points:**
- Instances are mounted with a `key` prop in the Application component
- Use `persistent` flag to keep instance alive across route changes
- Access instances via the `instances` context property (available in **all methods**)
- Instances can hold state and methods accessible from any component
- Without `persistent`, instances are destroyed when routes change

**Calling Instance Methods:**

Instance methods also receive context parameters. When calling them, Nullstack automatically passes the context:

```jsx
// Instance definition
class AuthInstance extends Nullstack {
  user = null;

  // Method receives context
  async login({ provider, router }) {
    // Login logic
    this.user = await authenticate(provider);
    router.path = '/dashboard';
  }

  async logout({ router, instances }) {
    this.user = null;
    instances.data.reset();  // Clear data cache
    router.path = '/login';
  }
}

// Using the instance
class LoginPage extends Nullstack {
  async handleLogin({ instances }) {
    // ✅ Call instance method - Nullstack passes context automatically
    await instances.auth.login({ provider: 'google' });
  }

  render({ instances }) {
    return (
      <div>
        {/* ✅ Direct reference - Works when method doesn't need custom params */}
        <button onclick={instances.auth.logout}>Logout</button>

        {/* ✅ Arrow function call - Pass custom params */}
        <button onclick={() => instances.auth.login({ provider: 'github' })}>
          Login with GitHub
        </button>

        {/* ✅ Call from component method */}
        <button onclick={this.handleLogin}>Login</button>
      </div>
    );
  }
}
```

**Important:**
- Instance methods automatically receive the full context
- **Direct reference**: `onclick={instances.auth.logout}` works when no custom params needed
- **With custom params**: Use arrow function `onclick={() => instances.auth.login({ provider: 'google' })}`
- Custom parameters are merged with the context by Nullstack
- Access both custom params and context: `login({ provider, router, instances })`
- The `instances` object is **ALWAYS available** in every method - it's automatically injected by Nullstack
- You never need to check if `instances` exists (no need for `instances?.app`)
- Simply access instances directly: `instances.app.showError()`, `instances.data.loadCompanies()`, etc.

**Best Practice - Instances Component Pattern:**

For better organization, create a dedicated `Instances` component that houses all your instance components:

```jsx
// src/Instances.jsx
import Nullstack from 'nullstack';
import AuthInstance from './instances/AuthInstance';
import CartInstance from './instances/CartInstance';
import NotificationInstance from './instances/NotificationInstance';

class Instances extends Nullstack {
  render() {
    return (
      <>
        <AuthInstance key="auth" persistent />
        <CartInstance key="cart" persistent />
        <NotificationInstance key="notification" persistent />
      </>
    );
  }
}

export default Instances;
```

Then render this `Instances` component once in your `Application.jsx`:

```jsx
// src/Application.jsx
import Nullstack from 'nullstack';
import Instances from './Instances';
import Home from './Home';
import About from './About';

class Application extends Nullstack {
  render() {
    return (
      <main>
        <Instances />
        <Home route="/" />
        <About route="/about" />
      </main>
    );
  }
}

export default Application;
```

**Benefits:**
- Centralized instance management
- Cleaner Application.jsx
- Easy to see all shared state/logic at a glance
- Simpler to add/remove instances

#### SEO and Page Metadata

Use the `page` context in the `prepare()` method to set SEO metadata:

```jsx
class Home extends Nullstack {
  prepare({ page, environment }) {
    page.title = 'Home - My App';
    page.description = 'Welcome to my application';
    page.locale = 'en-US';

    // Use environment to conditionally set metadata
    if (environment.server) {
      // Server-side only logic
      page.image = '/og-image.jpg';
    }
  }

  render() {
    return <h1>Home</h1>;
  }
}
```

**Available page properties:**
- `page.title` - Page title (shows in browser tab and SEO)
- `page.description` - Meta description for SEO
- `page.locale` - Language/locale (e.g., 'en-US', 'pt-BR')
- `page.image` - Open Graph image for social media sharing

#### Server vs Client Execution

- **Server functions** - Mark with `static async`:
  ```jsx
  static async getUsers() {
    // Runs only on server, can access databases, APIs with secrets, etc.
    return await database.users.findMany();
  }
  ```
- **Client methods** - Regular instance methods run on client
- **`prepare()`** - Runs on server for SSR/SSG
- **`initiate()` / `hydrate()`** - Run on client only

#### Build Modes

Set the build mode in your `package.json` build script using the `--mode` flag:

```json
{
  "scripts": {
    "build": "npx nullstack build --mode=ssg",
    "build:ssr": "npx nullstack build --mode=ssr"
  }
}
```

- **`ssg`** - Static Site Generation (pre-renders all pages at build time)
- **`ssr`** - Server-Side Rendering (renders pages on request)

