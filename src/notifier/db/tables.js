export const Tables = [
    `CREATE TABLE IF NOT EXISTS fish (
        fish_id INTEGER PRIMARY KEY,
        name_en TEXT NOT NULL,
        always_available BOOLEAN NOT NULL,
        big_fish BOOLEAN NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS intuition_requirements (
        fish_id INTEGER NOT NULL,
        intuition_fish_id INTEGER NOT NULL,
        CONSTRAINT fk_fish_id
            FOREIGN KEY(fish_id)
            REFERENCES fish(fish_id)
            ON DELETE CASCADE,
        CONSTRAINT fk_intuition_fish_id
            FOREIGN KEY(intuition_fish_id)
            REFERENCES fish(fish_id),
        PRIMARY KEY(fish_id, intuition_fish_id)
    )`,
    `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        discord_id INTEGER UNIQUE,
        is_channel BOOLEAN NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notification_strategies (
        user_id TEXT NOT NULL,
        strategy TEXT NOT NULL,
        CONSTRAINT fk_user_id
            FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE,
        PRIMARY KEY (user_id, strategy)
    )`,
    `CREATE TABLE IF NOT EXISTS fish_subscriptions (
        subscription_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        fish_id INTEGER NOT NULL,
        minutes_condition INTEGER NOT NULL,
        CONSTRAINT fk_user_id
            FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE,
        CONSTRAINT fk_fish_id
            FOREIGN KEY(fish_id)
            REFERENCES fish(fish_id)
            ON DELETE CASCADE,
        CONSTRAINT unique_fish_condition
            UNIQUE (user_id, fish_id, minutes_condition)
    )`,
    `CREATE TABLE IF NOT EXISTS intuition_subscriptions (
        intuition_subscription_id TEXT PRIMARY KEY,
        parent_subscription_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        fish_id INTEGER NOT NULL,
        minutes_condition INTEGER NOT NULL,
        CONSTRAINT fk_user_id
            FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE,
        CONSTRAINT fk_fish_id
            FOREIGN KEY(fish_id)
            REFERENCES fish(fish_id)
            ON DELETE CASCADE,
        CONSTRAINT fk_subscription_id
            FOREIGN KEY(parent_subscription_id)
            REFERENCES fish_subscriptions(subscription_id)
            ON DELETE CASCADE,
        CONSTRAINT unique_intuition_fish_condition
            UNIQUE (user_id, fish_id, minutes_condition)       
    )`    
]