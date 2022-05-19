import status from "./index.js"

const options = [
	"en-US",
	{
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	},
]

export function check(params: any) {
	if (params.toLocaleDateString(...options) !== "01/01/100001") return true
	else return false
}

export function get(params: any) {
	if (params.toLocaleDateString(...options) === "01/01/100001") return "-"
	if (params.toLocaleDateString(...options) === "01/01/1970") return "-"
	if (params.toLocaleDateString(...options) === "Invalid Date") return "-"
	return params.toLocaleDateString(...options)
}

export function ago(time: any, _s: number) {
	switch (typeof time) {
		case "number":
			break
		case "string":
			time = +new Date(time)
			break
		case "object":
			if (time.constructor === Date) time = time.getTime()
			break
		default:
			time = +new Date()
	}
	const time_formats = [
		[60, "seconds", 1],
		[120, "1 minute ago", "1 minute from now"],
		[3600, "minutes", 60],
		[7200, "1 hour ago", "1 hour from now"],
		[86400, "hours", 3600],
		[172800, "Yesterday", "Tomorrow"],
		[604800, "days", 86400],
		[1209600, "Last week", "Next week"],
		[2419200, "weeks", 604800],
		[4838400, "Last month", "Next month"],
		[29030400, "months", 2419200],
		[58060800, "Last year", "Next year"],
		[2903040000, "years", 29030400],
		[5806080000, "Last century", "Next century"],
		[58060800000, "centuries", 2903040000],
	]
	let seconds = (+new Date() - time) / 1000,
		token = "ago",
		list_choice = 1
	if (seconds == 0) {
		return "Just now"
	}
	if (seconds < 0) {
		seconds = Math.abs(seconds)
		token = "from now"
		list_choice = 2
	}
	let i = 0,
		format: any
	while ((format = time_formats[i++]))
		if (seconds < format[0]) {
			if (status[_s] === "plan_to_watch" && format[list_choice] == "Last year") {
				return get(new Date(time))
			} else if (typeof format[2] == "string") return format[list_choice]
			else return Math.floor(seconds / format[2]) + " " + format[1] + " " + token
		}
	format = time_formats[time_formats.length - 1]
	return Math.floor(seconds / format[2]) + " " + format[1] + " " + token
}
