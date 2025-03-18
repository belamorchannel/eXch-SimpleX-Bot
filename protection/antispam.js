class AntiSpam {
    constructor(cooldownTime = 5000) {
        this.cooldownTime = cooldownTime; 
        this.userCooldowns = new Map(); 
    }

    canExecute(senderName) {
        const now = Date.now();
        const lastCommandTime = this.userCooldowns.get(senderName) || 0;

        if (now - lastCommandTime < this.cooldownTime) {
            const remainingTime = Math.ceil((this.cooldownTime - (now - lastCommandTime)) / 1000);
            return {
                allowed: false,
                message: `!1 ⚠️ Too fast! Please wait ${remainingTime} seconds before the next command.`
            };
        }

        this.userCooldowns.set(senderName, now);
        return { allowed: true };
    }

    clearCooldown(senderName) {
        this.userCooldowns.delete(senderName);
    }
}

module.exports = AntiSpam;