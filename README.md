
---

# Development Setup

Follow these steps to set up and run the project:

### 1. Configure Environment Variables
Rename the `.env.example` file to `.env` and update its properties with the required values.

### 2. Install Dependencies
Run the following command to install the necessary dependencies:
```bash
npm install
```

### 3. **Optional**: Register Slash Commands
To register slash commands, edit the `src/Test.ts` file:
- Uncomment one of the blocks of code.
- If updating a specific guild, copy the server ID into the `GUILD_ID` variable.

Then, execute the following command to install the slash commands into your bot application:
```bash
npm run dev
```

### 4. Run the Bot
Start the bot using:
```bash
npm run start
```

---

This version is more polished and professional, while maintaining clarity and a step-by-step flow. Let me know if you need further adjustments!