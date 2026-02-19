# Scanner Repertoire

> Pattern learning file for the Deep Scanner service. This file stores learned patterns for continuous improvement of code analysis capabilities.

**Version:** 1.0.0  
**Created:** 2026-02-19T15:55:00Z  
**Last Updated:** 2026-02-19T15:55:00Z  
**Total Patterns:** 12

---

## Pattern Categories

This repertoire organizes patterns into four main categories aligned with the scanner's pass types:

1. **Anti-Patterns** - Code smells and design anti-patterns
2. **Architecture** - Structural and dependency issues
3. **Performance** - Efficiency and optimization problems
4. **Security** - Vulnerabilities and security risks

---

## Anti-Patterns

Patterns that indicate code smells and design issues that reduce maintainability.

### AP-001: God Class

| Property | Value |
|----------|-------|
| **ID** | `anti-pattern/god-class` |
| **Severity** | High |
| **Match Type** | Hybrid (AST + Metrics) |
| **Enabled** | ✅ Yes |

**Description:**  
A class that has too many responsibilities, typically indicated by a high number of methods, properties, or lines of code. Violates the Single Responsibility Principle.

**Detection Criteria:**
- Class has more than 15 methods
- Class has more than 20 properties
- Class exceeds 500 lines of code
- High cyclomatic complexity (> 20)

**Example Code:**
```typescript
// ❌ Bad: God class with too many responsibilities
export class UserService {
  createUser() { /* ... */ }
  updateUser() { /* ... */ }
  deleteUser() { /* ... */ }
  sendEmail() { /* ... */ }
  validateEmail() { /* ... */ }
  generateReport() { /* ... */ }
  exportToPDF() { /* ... */ }
  calculateStats() { /* ... */ }
  // ... 20+ more methods
}

// ✅ Good: Split into focused classes
export class UserService {
  createUser() { /* ... */ }
  updateUser() { /* ... */ }
  deleteUser() { /* ... */ }
}

export class EmailService {
  send() { /* ... */ }
  validate() { /* ... */ }
}

export class UserReportService {
  generate() { /* ... */ }
  exportToPDF() { /* ... */ }
  calculateStats() { /* ... */ }
}
```

**Recommended Fix:**  
Extract responsibilities into separate classes following the Single Responsibility Principle. Identify cohesive groups of methods and create new service classes.

**False Positive Indicators:**
- Data transfer objects (DTOs) with many properties but no logic
- Builder pattern classes with fluent interfaces
- Configuration classes with many optional properties

---

### AP-002: Duplicate Code

| Property | Value |
|----------|-------|
| **ID** | `anti-pattern/duplicate-code` |
| **Severity** | Medium |
| **Match Type** | Semantic |
| **Enabled** | ✅ Yes |

**Description:**  
Identical or very similar code blocks appear in multiple locations, making maintenance difficult and increasing the risk of inconsistent behavior.

**Detection Criteria:**
- Code blocks with > 80% similarity
- Minimum 6 lines of code
- Same structure with minor variable name differences
- Copy-paste patterns detected

**Example Code:**
```typescript
// ❌ Bad: Duplicated validation logic
function validateUser(user: User) {
  if (!user.email || !user.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!user.name || user.name.length < 2) {
    throw new Error('Invalid name')
  }
  if (!user.age || user.age < 0) {
    throw new Error('Invalid age')
  }
}

function validateAdmin(admin: Admin) {
  if (!admin.email || !admin.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!admin.name || admin.name.length < 2) {
    throw new Error('Invalid name')
  }
  if (!admin.age || admin.age < 0) {
    throw new Error('Invalid age')
  }
}

// ✅ Good: Extracted common validation
function validatePerson(person: { email: string; name: string; age: number }) {
  if (!person.email || !person.email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (!person.name || person.name.length < 2) {
    throw new Error('Invalid name')
  }
  if (!person.age || person.age < 0) {
    throw new Error('Invalid age')
  }
}
```

**Recommended Fix:**  
Extract the duplicated code into a shared function, method, or utility class. Apply the DRY (Don't Repeat Yourself) principle.

**False Positive Indicators:**
- Similar code that serves different business purposes
- Test fixtures and test data
- Generated code (e.g., protobuf, GraphQL types)

---

### AP-003: Magic Numbers

| Property | Value |
|----------|-------|
| **ID** | `anti-pattern/magic-numbers` |
| **Severity** | Low |
| **Match Type** | Regex |
| **Enabled** | ✅ Yes |

**Description:**  
Numeric or string literals appear in code without explanation, making the code harder to understand and maintain.

**Detection Criteria:**
- Numeric literals other than 0, 1, 2 in calculations
- String literals used as status codes or identifiers
- Timeout values without named constants
- Array indices used without explanation

**Example Code:**
```typescript
// ❌ Bad: Magic numbers without context
function calculateDiscount(price: number, tier: number) {
  if (tier === 1) return price * 0.95
  if (tier === 2) return price * 0.90
  if (tier === 3) return price * 0.85
  return price
}

setTimeout(() => reconnect(), 5000)

// ✅ Good: Named constants with clear meaning
const DISCOUNT_RATES = {
  BRONZE: 0.95,
  SILVER: 0.90,
  GOLD: 0.85,
} as const

const RECONNECT_DELAY_MS = 5000

function calculateDiscount(price: number, tier: keyof typeof DISCOUNT_RATES) {
  return price * DISCOUNT_RATES[tier]
}

setTimeout(() => reconnect(), RECONNECT_DELAY_MS)
```

**Recommended Fix:**  
Replace magic numbers with named constants that explain their purpose. Use enums or constant objects for related values.

**False Positive Indicators:**
- Mathematical formulas where numbers have inherent meaning (e.g., `area = width * height / 2`)
- Array indices in simple loops
- Well-known constants like PI, E

---

## Architecture

Patterns that indicate structural problems in the codebase design.

### AR-001: Tight Coupling

| Property | Value |
|----------|-------|
| **ID** | `architecture/tight-coupling` |
| **Severity** | High |
| **Match Type** | Hybrid (AST + Import Analysis) |
| **Enabled** | ✅ Yes |

**Description:**  
Components are too dependent on each other's implementation details, making the system rigid and hard to test or modify.

**Detection Criteria:**
- Direct instantiation of concrete classes instead of dependency injection
- Accessing private members through reflection or type assertions
- Multiple imports from internal implementation files
- High fan-out (many outgoing dependencies)

**Example Code:**
```typescript
// ❌ Bad: Tight coupling through direct instantiation
class OrderService {
  private paymentService = new PaymentService()  // Direct instantiation
  private emailService = new EmailService()      // Direct instantiation
  
  processOrder(order: Order) {
    this.paymentService.charge(order.total)
    this.emailService.sendReceipt(order)
  }
}

// ✅ Good: Loose coupling through dependency injection
interface IPaymentService {
  charge(amount: number): Promise<void>
}

interface IEmailService {
  sendReceipt(order: Order): Promise<void>
}

class OrderService {
  constructor(
    private readonly paymentService: IPaymentService,
    private readonly emailService: IEmailService
  ) {}
  
  processOrder(order: Order) {
    this.paymentService.charge(order.total)
    this.emailService.sendReceipt(order)
  }
}
```

**Recommended Fix:**  
Introduce interfaces and dependency injection. Depend on abstractions rather than concretions. Use inversion of control containers where appropriate.

**False Positive Indicators:**
- Value objects and data transfer objects
- Factory classes that intentionally create instances
- Configuration or builder patterns

---

### AR-002: Circular Dependency

| Property | Value |
|----------|-------|
| **ID** | `architecture/circular-dependency` |
| **Severity** | High |
| **Match Type** | AST |
| **Enabled** | ✅ Yes |

**Description:**  
Two or more modules depend on each other directly or indirectly, creating a cycle that can cause initialization issues and make the code harder to understand.

**Detection Criteria:**
- Module A imports from Module B, and Module B imports from Module A
- Longer cycles: A → B → C → A
- Re-exports that create indirect cycles
- Type-only imports that create circular type references

**Example Code:**
```typescript
// ❌ Bad: Circular dependency
// user.service.ts
import { OrderService } from './order.service'

export class UserService {
  getOrders(userId: string) {
    return OrderService.getOrdersByUser(userId)
  }
}

// order.service.ts
import { UserService } from './user.service'

export class OrderService {
  getUserForOrder(orderId: string) {
    const order = this.getOrder(orderId)
    return UserService.getUser(order.userId)
  }
}

// ✅ Good: Break the cycle with a shared module
// types.ts
export interface User { id: string; name: string }
export interface Order { id: string; userId: string }

// user.service.ts
import type { Order } from './types'

export class UserService {
  getOrders(userId: string): Order[] { /* ... */ }
}

// order.service.ts
import type { User } from './types'

export class OrderService {
  getUserForOrder(orderId: string): User { /* ... */ }
}
```

**Recommended Fix:**  
Extract shared types and interfaces into a separate module. Use dependency injection or event-based communication to break direct dependencies. Consider the mediator pattern.

**False Positive Indicators:**
- Type-only imports in TypeScript (can be refactored to `import type`)
- Test files that mock circular dependencies
- Lazy-loaded modules

---

### AR-003: Lack of Abstraction

| Property | Value |
|----------|-------|
| **ID** | `architecture/lack-of-abstraction` |
| **Severity** | Medium |
| **Match Type** | Semantic |
| **Enabled** | ✅ Yes |

**Description:**  
Code operates on low-level details without proper abstraction layers, making it harder to understand, test, and maintain.

**Detection Criteria:**
- Direct file system operations scattered throughout code
- Raw SQL queries in business logic
- Direct HTTP client calls without service layer
- Primitive obsession (using primitives instead of domain types)

**Example Code:**
```typescript
// ❌ Bad: No abstraction, primitive obsession
function processUser(userData: string[]) {
  const age = parseInt(userData[2])
  if (age > 18) {
    fs.writeFileSync(`/users/${userData[0]}.json`, JSON.stringify(userData))
    fetch('https://api.example.com/notify', {
      method: 'POST',
      body: JSON.stringify({ email: userData[1] })
    })
  }
}

// ✅ Good: Proper abstractions
interface User {
  id: string
  email: string
  age: number
}

class UserRepository {
  constructor(private readonly storage: StorageService) {}
  
  save(user: User): Promise<void> {
    return this.storage.write(`users/${user.id}`, user)
  }
}

class NotificationService {
  constructor(private readonly api: ApiClient) {}
  
  notifyUser(email: string): Promise<void> {
    return this.api.post('notify', { email })
  }
}

class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly notifications: NotificationService
  ) {}
  
  async process(user: User): Promise<void> {
    if (user.age > 18) {
      await this.users.save(user)
      await this.notifications.notifyUser(user.email)
    }
  }
}
```

**Recommended Fix:**  
Introduce abstraction layers (repositories, services, adapters). Create domain types instead of using primitives. Apply the Dependency Inversion Principle.

**False Positive Indicators:**
- Utility functions that intentionally work with primitives
- Configuration or setup code
- Simple scripts without complex domain logic

---

## Performance

Patterns that indicate efficiency and optimization problems.

### PF-001: N+1 Query Problem

| Property | Value |
|----------|-------|
| **ID** | `performance/n-plus-one` |
| **Severity** | High |
| **Match Type** | Hybrid (AST + Pattern) |
| **Enabled** | ✅ Yes |

**Description:**  
A database query is executed for each item in a collection instead of fetching all related data in a single query, causing severe performance degradation.

**Detection Criteria:**
- Database query inside a loop
- Async/await inside `.map()`, `.forEach()`, or `for...of`
- Fetching related entities one at a time
- Missing eager loading or batch fetching

**Example Code:**
```typescript
// ❌ Bad: N+1 queries
async function getOrdersWithUsers(): Promise<OrderWithUser[]> {
  const orders = await db.query('SELECT * FROM orders')
  const result = []
  
  for (const order of orders) {
    // This executes N queries for N orders!
    const user = await db.query('SELECT * FROM users WHERE id = ?', [order.userId])
    result.push({ ...order, user })
  }
  
  return result
}

// ✅ Good: Single query with JOIN or batch loading
async function getOrdersWithUsers(): Promise<OrderWithUser[]> {
  const orders = await db.query(`
    SELECT orders.*, users.* 
    FROM orders 
    JOIN users ON orders.userId = users.id
  `)
  return orders.map(order => ({ ...order, user: order.user }))
}

// Or with batch loading:
async function getOrdersWithUsers(): Promise<OrderWithUser[]> {
  const orders = await db.query('SELECT * FROM orders')
  const userIds = orders.map(o => o.userId)
  const users = await db.query('SELECT * FROM users WHERE id IN (?)', [userIds])
  const userMap = new Map(users.map(u => [u.id, u]))
  
  return orders.map(order => ({
    ...order,
    user: userMap.get(order.userId)
  }))
}
```

**Recommended Fix:**  
Use JOINs, eager loading, or batch fetching to retrieve all related data in one or two queries instead of N queries.

**False Positive Indicators:**
- Loops where the query result is cached
- Intentional sequential processing with dependencies between queries
- Rate-limited API calls that must be sequential

---

### PF-002: Memory Leak Pattern

| Property | Value |
|----------|-------|
| **ID** | `performance/memory-leak` |
| **Severity** | High |
| **Match Type** | Hybrid |
| **Enabled** | ✅ Yes |

**Description:**  
Code patterns that can lead to memory leaks by holding references to objects that should be garbage collected.

**Detection Criteria:**
- Event listeners added but never removed
- Timers/intervals without cleanup
- Closures capturing large objects
- Global caches without size limits
- Observable subscriptions without unsubscription

**Example Code:**
```typescript
// ❌ Bad: Memory leak through uncleared listeners and timers
class DataFetcher {
  private cache: Map<string, any> = new Map()
  
  constructor(private readonly emitter: EventEmitter) {
    // Listener never removed
    emitter.on('data', (data) => {
      this.cache.set(data.id, data)
    })
    
    // Interval never cleared
    setInterval(() => {
      this.refreshCache()
    }, 1000)
  }
}

// ✅ Good: Proper cleanup
class DataFetcher implements Disposable {
  private cache: Map<string, any> = new Map()
  private readonly handlers: Map<string, Function> = new Map()
  private readonly timers: NodeJS.Timeout[] = []
  
  constructor(private readonly emitter: EventEmitter) {
    const handler = (data: any) => this.cache.set(data.id, data)
    emitter.on('data', handler)
    this.handlers.set('data', handler)
    
    const timer = setInterval(() => this.refreshCache(), 1000)
    this.timers.push(timer)
  }
  
  [Symbol.dispose]() {
    // Remove all listeners
    for (const [event, handler] of this.handlers) {
      this.emitter.off(event, handler as any)
    }
    
    // Clear all timers
    for (const timer of this.timers) {
      clearInterval(timer)
    }
    
    this.cache.clear()
  }
}
```

**Recommended Fix:**  
Implement proper cleanup in dispose/unmount methods. Use weak references for caches. Track subscriptions and clean them up when the component is destroyed.

**False Positive Indicators:**
- Singleton services that live for the application lifetime
- Event listeners on global objects that should never be removed
- Test setup code

---

### PF-003: Inefficient Loop

| Property | Value |
|----------|-------|
| **ID** | `performance/inefficient-loop` |
| **Severity** | Medium |
| **Match Type** | Hybrid |
| **Enabled** | ✅ Yes |

**Description:**  
Loop patterns that are unnecessarily inefficient, such as doing expensive operations inside loops that could be done outside.

**Detection Criteria:**
- Repeated calculations inside loops that produce the same result
- Array searches inside loops (O(n²) complexity)
- Creating new objects/arrays on each iteration
- Using `.find()` or `.filter()` inside `.map()` loops

**Example Code:**
```typescript
// ❌ Bad: Inefficient nested operations
function processItems(items: Item[], categories: Category[]) {
  return items.map(item => {
    // O(n) search inside O(n) loop = O(n²)
    const category = categories.find(c => c.id === item.categoryId)
    
    // Expensive calculation repeated for each item
    const taxRate = calculateTaxRate(item.price, item.location)
    
    return {
      ...item,
      categoryName: category?.name,
      total: item.price * (1 + taxRate)
    }
  })
}

// ✅ Good: Optimize with lookup and pre-calculation
function processItems(items: Item[], categories: Category[]) {
  // Create lookup map once: O(n)
  const categoryMap = new Map(categories.map(c => [c.id, c]))
  
  // Group items by location for batch tax calculation
  const locationGroups = groupBy(items, 'location')
  const taxRates = new Map<string, number>()
  
  for (const location of Object.keys(locationGroups)) {
    // Calculate tax rate once per location
    taxRates.set(location, calculateTaxRate(location))
  }
  
  // Now O(n) overall
  return items.map(item => ({
    ...item,
    categoryName: categoryMap.get(item.categoryId)?.name,
    total: item.price * (1 + (taxRates.get(item.location) ?? 0))
  }))
}
```

**Recommended Fix:**  
Move invariant calculations outside loops. Use Map/Set for O(1) lookups instead of array searches. Consider batch processing for expensive operations.

**False Positive Indicators:**
- Small arrays where performance difference is negligible
- Dynamic data that changes on each iteration
- Code where readability is prioritized over performance

---

## Security

Patterns that indicate security vulnerabilities and risks.

### SC-001: SQL Injection

| Property | Value |
|----------|-------|
| **ID** | `security/sql-injection` |
| **Severity** | Critical |
| **Match Type** | Regex |
| **Enabled** | ✅ Yes |

**Description:**  
User input is concatenated directly into SQL queries, allowing attackers to execute arbitrary SQL commands.

**Detection Criteria:**
- String concatenation in SQL queries
- Template literals with variables in SQL
- Direct user input in database queries
- Missing parameterized query usage

**Example Code:**
```typescript
// ❌ Bad: SQL injection vulnerability
function getUserById(userId: string) {
  const query = `SELECT * FROM users WHERE id = '${userId}'`
  return db.query(query)
}

// Attack: userId = "1' OR '1'='1" returns all users!

// ✅ Good: Parameterized query
function getUserById(userId: string) {
  const query = 'SELECT * FROM users WHERE id = ?'
  return db.query(query, [userId])
}

// Or using a query builder:
function getUserById(userId: string) {
  return db.select('*')
    .from('users')
    .where('id', userId)
}
```

**Recommended Fix:**  
Always use parameterized queries or prepared statements. Use an ORM or query builder that automatically escapes inputs. Never concatenate user input into SQL strings.

**False Positive Indicators:**
- Static SQL strings with no user input
- SQL in migration files
- SQL in test fixtures with hardcoded values

---

### SC-002: Cross-Site Scripting (XSS)

| Property | Value |
|----------|-------|
| **ID** | `security/xss` |
| **Severity** | Critical |
| **Match Type** | Hybrid |
| **Enabled** | ✅ Yes |

**Description:**  
User input is rendered to HTML without proper sanitization, allowing attackers to inject malicious scripts.

**Detection Criteria:**
- `innerHTML` assignment with user input
- `dangerouslySetInnerHTML` in React
- Unescaped user input in HTML templates
- Direct DOM manipulation with user data

**Example Code:**
```typescript
// ❌ Bad: XSS vulnerability
function displayUserComment(comment: string) {
  document.getElementById('comments')!.innerHTML = `
    <div class="comment">${comment}</div>
  `
}

// Attack: comment = "<script>stealCookies()</script>"

// ✅ Good: Sanitize or escape user input
import DOMPurify from 'dompurify'

function displayUserComment(comment: string) {
  const sanitized = DOMPurify.sanitize(comment)
  document.getElementById('comments')!.innerHTML = `
    <div class="comment">${sanitized}</div>
  `
}

// Or use textContent for plain text:
function displayUserComment(comment: string) {
  const div = document.createElement('div')
  div.className = 'comment'
  div.textContent = comment  // Automatically escaped
  document.getElementById('comments')!.appendChild(div)
}

// React example:
function Comment({ text }: { text: string }) {
  return <div className="comment">{text}</div>  // Auto-escaped
}
```

**Recommended Fix:**  
Use textContent instead of innerHTML for plain text. Sanitize HTML with a library like DOMPurify. Use framework features that auto-escape content.

**False Positive Indicators:**
- Trusted content from your own database (though still risky)
- Server-side rendering with proper escaping
- Content Security Policy in place

---

### SC-003: Hardcoded Secrets

| Property | Value |
|----------|-------|
| **ID** | `security/hardcoded-secret` |
| **Severity** | Critical |
| **Match Type** | Regex |
| **Enabled** | ✅ Yes |

**Description:**  
Sensitive credentials like API keys, passwords, or tokens are hardcoded in source code, exposing them to anyone with repository access.

**Detection Criteria:**
- String literals that look like API keys (long alphanumeric strings)
- Variable names containing "password", "secret", "key", "token"
- Connection strings with embedded credentials
- Private keys in source files

**Example Code:**
```typescript
// ❌ Bad: Hardcoded secrets
const API_KEY = 'sk-1234567890abcdefghijklmnop'
const DB_PASSWORD = 'super_secret_password_123'
const JWT_SECRET = 'my-super-secret-jwt-key'

const config = {
  database: 'postgresql://user:password123@localhost:5432/mydb',
  stripe: {
    apiKey: 'sk_live_abcdefghijklmnop'
  }
}

// ✅ Good: Environment variables
const API_KEY = process.env.API_KEY
const DB_PASSWORD = process.env.DB_PASSWORD
const JWT_SECRET = process.env.JWT_SECRET

const config = {
  database: process.env.DATABASE_URL,
  stripe: {
    apiKey: process.env.STRIPE_API_KEY
  }
}

// With validation:
import { z } from 'zod'

const envSchema = z.object({
  API_KEY: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  STRIPE_API_KEY: z.string().startsWith('sk_'),
})

const env = envSchema.parse(process.env)
```

**Recommended Fix:**  
Use environment variables or a secrets manager. Never commit secrets to version control. Use tools like git-secrets or pre-commit hooks to prevent accidental commits.

**False Positive Indicators:**
- Example or placeholder values (e.g., 'your-api-key-here')
- Public keys (as opposed to private keys)
- Test fixtures with fake credentials
- Variable names that happen to contain "key" but aren't secrets

---

## Pattern Statistics

| Category | Total | Enabled | Critical | High | Medium | Low |
|----------|-------|---------|----------|------|--------|-----|
| Anti-Patterns | 3 | 3 | 0 | 1 | 1 | 1 |
| Architecture | 3 | 3 | 0 | 2 | 1 | 0 |
| Performance | 3 | 3 | 0 | 2 | 1 | 0 |
| Security | 3 | 3 | 2 | 0 | 0 | 0 |
| **Total** | **12** | **12** | **2** | **5** | **3** | **1** |

---

## Pattern Learning Log

This section tracks new patterns learned from scan results and user feedback.

| Date | Pattern | Source | Action |
|------|---------|--------|--------|
| - | - | - | - |

---

## Notes

- Patterns are ordered by severity within each category
- False positive indicators help reduce noise in scan results
- New patterns can be added based on project-specific needs
- The repertoire is designed to be extended with custom patterns
- Pattern matching uses a combination of regex, AST analysis, and semantic understanding
