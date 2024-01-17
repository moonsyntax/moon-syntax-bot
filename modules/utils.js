export function parseCommand(text) {
	const items = text.split(' ');
	return items.map((x) => x.trim());
}

export function replyandlog(ctx, text) {
	console.log(text);
	return ctx.reply(text);
}
