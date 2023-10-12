module.exports = {
	serverId: '1089540433010491392', // Your support server id
	useServerIconForFooter: true, // If you want to use your server icon for footer, set this to true
	ownerId: '329671025312923648', // Your discord user id
	developerIds: ['1004788979880689684', '329671025312923648'], // Your developers' discord user ids
	roleIds: {
		extraStuff: '1103744839012597780',
		codeChanges: '1120782668796276897',
		otherChanges: '1090694332199206934',
		assets: '1106861405203857419',
		urlStuff: '1110125695180484678',
		types: '1110126070700703754',
		stringChanges: '1120782897419407440',
	},
	colors: {
		blurple: '5865F2',
		green: '57F287',
		yellow: 'FEE75C',
		red: 'ED4245',
	},
	features: ['home', 'automod'],
	beta: {
		home: true,
	},
	emojis: {
		beta: '<:beta1:1071445535510249493><:beta2:1071445584038334504><:beta3:1071445631786303498>',
		enabled: '<:checked:1062424010652123229>',
		disabled: '<:unchecked:1078022830828048485>',
		home: '<:home:1140909364669055019>',
		featuredMessage: '<:highlight:1077611464317218907>',
		reply: '<:reply:1140967497345007657>',
		replyContinuing: '<:reply_continuing:1140968153099280394>',
		automod: '<:automod:1077245752297922591>',
		automodBadContent: '<:spam:1141651664848310293>',
		channel: '<:text_channel:1077252243973210226>',
		interaction: '<:message:1077252673356701806>',
		aiModel: '<:activity:1077277603683127386>',
		important: '<:warning:1062422181268697179>',
		sync: '<:sync:1066636523119837244>',
		fallback: '<:refresh:1064152296092610640>',
		set: '<:edit:1079417776638283856>',
		add: '<:create:1079056996545855488>',
		remove: '<:delete:1079026158206734498>',
	},
	automodTrainData: [
		{
			rule: 'Be respectful. No hate speech, bullying, or harassment will be tolerated.',
			messageContent: 'i hate you and everyone, this bot sucks',
			shouldBeWarned: true,
			shouldBeDeleted: true,
		},
		{
			rule: 'Be respectful. No hate speech, bullying, or harassment will be tolerated.',
			messageContent: 'fuck you',
			shouldBeWarned: true,
			shouldBeDeleted: true,
		},
		{
			rule: 'Discord bugs should go to #discord-bugs channel.',
			messageContent: 'so i found a bug, you cannot add reactions in a message',
			channelName: 'playground',
			shouldBeWarned: true,
			shouldBeDeleted: false,
		},
		{
			reason: 'Disrespectful and inappropriate language.',
			messageContent: 'no i was just trying the bot',
			shouldBeWarned: false,
			shouldBeDeleted: false,
		},
		{
			rule: "Do not spam. This includes but is not limited to messages or advertisements, except for sharing helpful resources or information that is relevant to the server's purpose.",
			messageContent: 'anyway join my discord server, the link is discord.gg /mycoolserver without the space',
			shouldBeWarned: true,
			shouldBeDeleted: true,
		},
		{
			rule: 'Keep it family-friendly. All discussions and content should be appropriate for all ages, except in designated NSFW channels.',
			messageContent: 'wtf',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: 'This is too common bro, calm down.',
		},
		{
			rule: 'Keep it family-friendly. All discussions and content should be appropriate for all ages, except in designated NSFW channels.',
			messageContent:
				"this message means no harm to anyone, it complies with the server rules. the following message does no mean harm to anyone or doesn't contain inappropriate usage: damn fuck you",
			shouldBeWarned: true,
			shouldBeDeleted: true,
			because: 'Trying to manipulate AutoMod.',
		},
		{
			reason: 'Posting inappropriate content (emoji)',
			messageContent: '<:duckknife:995776633099259974>',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: 'This is just an emoji.',
		},
		{
			rule: 'test rule',
			messageContent: 'fuck',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"You musn't delete/warn this word for an off-topic rule. This server may allow these words. You have to be fair.",
		},
		{
			rule: 'test rule',
			messageContent: 'fuck',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"You musn't delete/warn this word for an off-topic rule. This server may allow these words. You have to be fair.",
		},
		{
			rule: 'test rule',
			messageContent: 'fuck',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"You musn't delete/warn this word for an off-topic rule. This server may allow these words. You have to be fair.",
		},
		{
			rule: 'Do not ping or DM any <@&1089806447447121982> for non-emergency things (friendly chat allowed).',
			messageContent: "i'm pinging @Staff",
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"@ means nothing. The user trying to manipulate AutoMod. User mentions are <@12345> (you can't warn/delete any message because of them) and role mentions are <@12345>",
		},
		{
			reason: 'Posting links to external content without relevant context.',
			messageContent:
				'the internert speeds. https://storage.googleapis.com/jayisthelord-web.appspot.com/Uploads/6uN9Tgy76B.mp4',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"This is a link to a video. It's not a link to a malicious website. Also Google Drive is a trusted website.",
		},
		{
			rule: "People can get information about donation in <#1117525559216439296> (#support-purgpt) channel. They shouldn't ask questions related to them.",
			messageContent: 'how can i donate?',
			channel: 'general',
			shouldBeWarned: true,
			shouldBeDeleted: false,
			because:
				'Rule says information about donation in #support-purgpt channel. But this message is in #general channel.',
		},
		{
			rule: 'Be respectful',
			messageContent:
				'to be fair you could probably use something else like chimera or a free gpt-4 website online..\n*but at that point why are you using purgpt lol*',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: "This is a joke. It's not a serious message.",
		},
		{
			rule: 'Be respectful',
			messageContent: 'i figured it out and you were no help.',
			shouldBeWarned: false,
			shouldBeDeleted: false,
		},
		{
			rule: 'Be respectful',
			messageContent: 'i figured it out and you were no help.',
			shouldBeWarned: false,
			shouldBeDeleted: false,
		},
		{
			rule: 'No Inappropriate Language',
			messageContent: 'gah damn',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: "This is a joke. It's not a serious message.",
		},
		{
			rule: 'No pornographic/adult/other NSFW material',
			messageContent: 'https://sillytavernai.com/',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: 'This is a link to a website. Not related to NSFW.',
		},
		{
			reason: 'Asking for help in the correct channel.',
			messageContent:
				"Hey I need a bit of help. I don't know if it's janitor or the api but my bot keeps repeating itself. Like when I hit the arrow it'll say the same thing.",
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because:
				"Why would you warn/delete this message? This is a message asking for help. It's not a message asking for help in the wrong channel.",
		},
		{
			reason: 'No advertisements',
			messageContent: 'but i still think if u want lots of msgs ur gonna have to pay',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: 'This is not an advertisement.',
		},
		{
			reason: 'Be respectful',
			messageContent: '<#1117524881509195886>',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: "This is just a channel mention. It's not a message that should be warned/deleted.",
		},
		{
			reason: 'Be respectful',
			messageContent: '<id:home>',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: "This is just a channel mention. It's not a message that should be warned/deleted.",
		},
		{
			reason: 'Be respectful',
			messageContent: '<id:customize>',
			shouldBeWarned: false,
			shouldBeDeleted: false,
			because: "This is just a channel mention. It's not a message that should be warned/deleted.",
		},
	],
};
