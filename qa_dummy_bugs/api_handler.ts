interface User {
    id: number;
    profile?: {
        name: string;
    };
}

function printUserName(user: User) {
    // BUG: Cannot read properties of undefined (reading 'name') if profile is undefined
    console.log(user.profile.name);
}

const testUser = { id: 1 };
printUserName(testUser);
