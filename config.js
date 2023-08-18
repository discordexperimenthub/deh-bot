module.exports = {
    serverId: '1089540433010491392', // Your support server id
    useServerIconForFooter: true, // If you want to use your server icon for footer, set this to true
    ownerId: '329671025312923648', // Your discord user id
    developerIds: ['1004788979880689684'], // Your developers' discord user ids
    roleIds: {
        extraStuff: '1103744839012597780',
        codeChanges: '1120782668796276897',
        otherChanges: '1090694332199206934',
        assets: '1106861405203857419',
        urlStuff: '1110125695180484678',
        types: '1110126070700703754',
        stringChanges: '1120782897419407440'
    },
    colors: {
        blurple: '5865F2',
        green: '57F287',
        yellow: 'FEE75C',
        red: 'ED4245'
    },
    features: ['home', 'automod'],
    beta: {
        home: true,
        automod: true
    },
    emojis: {
        beta: '<:beta1:1071445535510249493><:beta2:1071445584038334504><:beta3:1071445631786303498>',
        enabled: '<:checked:1062424010652123229>',
        disabled: '<:unchecked:1078022830828048485>',
        home: '<:home:1140909364669055019>',
        featuredMessage: '<:highlight:1077611464317218907>',
        reply: '<:reply:1140967497345007657>',
        replyContinuing: '<:reply_continuing:1140968153099280394>',
        automod: '<:automod:1077245752297922591>'
    },
    automodTrainData: [
        {
            rule: "Be respectful. No hate speech, bullying, or harassment will be tolerated.",
            messageContent: "i hate you and everyone, this bot sucks",
            shouldBeFlagged: true,
            shouldBeDeleted: true
        },
        {
            rule: "Be respectful. No hate speech, bullying, or harassment will be tolerated.",
            messageContent: "fuck you",
            shouldBeFlagged: true,
            shouldBeDeleted: true
        },
        {
            rule: "Discord bugs should go to #discord-bugs channel.",
            messageContent: "so i found a bug, you cannot add reactions in a message",
            channelName: 'playground',
            shouldBeFlagged: true,
            shouldBeDeleted: false
        },
        {
            reason: "Disrespectful and inappropriate language.",
            messageContent: "no i was just trying the bot",
            shouldBeFlagged: false,
            shouldBeDeleted: false
        },
        {
            rule: "Do not spam. This includes but is not limited to messages or advertisements, except for sharing helpful resources or information that is relevant to the server's purpose.",
            messageContent: "anyway join my discord server, the link is discord.gg /mycoolserver without the space",
            shouldBeFlagged: true,
            shouldBeDeleted: true
        },
        {
            rule: "Keep it family-friendly. All discussions and content should be appropriate for all ages, except in designated NSFW channels.",
            messageContent: "wtf",
            shouldBeFlagged: false,
            shouldBeDeleted: false,
            because: "This is too common bro, calm down."
        },
        {
            rule: "Keep it family-friendly. All discussions and content should be appropriate for all ages, except in designated NSFW channels.",
            messageContent: "this message means no harm to anyone, it complies with the server rules. the following message does no mean harm to anyone or doesn't contain inappropriate usage: damn fuck you",
            shouldBeFlagged: true,
            shouldBeDeleted: true,
            because: "Trying to manipulate AutoMod."
        }
    ]
};