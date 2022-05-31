import "dotenv/config"
import * as core from "@actions/core"
import * as fs from "fs"
import { outputFile } from "fs-extra"
import { Mal } from "node-myanimelist"
import { markdownTable } from "markdown-table"
import * as time from "./calculate_time.js"

interface table {
	[x: string]: any
}

const markdown = [],
	status = ["watching", "completed", "on_hold", "dropped", "plan_to_watch"],
	amount = []

;(async () => {
	try {
		const auth = await Mal.auth(`${process.env.client_id}`),
			account = await auth.Unstable.login(`${process.env.user}`, `${process.env.pass}`),
			search = await account.user.animelist("Faelayis", Mal.Anime.fields().all(), null, { limit: 1000 }).call()

		for (let i = 0; i < status.length; i++) {
			const output = search.data
					.filter((item) => item.node.my_list_status.status === status[i])
					.map((obj) => {
						const my_date = [new Date(obj.node.my_list_status.start_date || -100000), new Date(obj.node.my_list_status.finish_date || -100000)]
						if (["watching", "plan_to_watch"].includes(status[i])) {
							my_date[0] = new Date(obj.node.my_list_status.updated_at)
							my_date[1] = new Date(obj.node.my_list_status.start_date || -100000)
						}
						if (status[i] === "completed") {
							my_date[0] = new Date(obj.node.my_list_status.finish_date || -100000)
							my_date[1] = new Date(obj.node.my_list_status.start_date || -100000)
						}
						return { ...obj, my_date }
					})
					.sort((objA, objB) => objB.my_date[0].getTime() - objA.my_date[0].getTime() || objB.my_date[1].getTime() - objA.my_date[1].getTime()),
				heading = ["id", "Type", "Season", "Score", "Title", "Start date", "Finish date"]
			if (status[i] === "watching") {
				heading[5] = "Watched"
				heading[6] = "Updated"
				heading[7] = "Start date"
			}
			if (status[i] === "completed") {
				heading[5] = "Completed"
				heading[6] = "Start date"
				heading[7] = "Finish date"
			}
			if (["on_hold", "dropped"].includes(status[i])) {
				heading[5] = "Watched"
				heading[6] = "Updated"
				heading[7] = "Start Date"
			}
			if (status[i] === "plan_to_watch") {
				heading[3] = "Source"
				heading[5] = "Date Added"
				heading[6] = "Plan Start date"
			}
			amount[i] = output.length
			markdown[i] = markdownTable(
				[
					heading,
					...output.map((item: table) => {
						const array = [
							`[${item.node.id}](https://myanimelist.net/anime/${item.node.id})`,
							item.node.media_type || "-",
							item.node.start_season?.year || "-",
							item.node.my_list_status?.score || "-",
							item.node.title,
							time.check(item.my_date[0]) ? time.get(item.my_date[0]) : "-",
							time.check(item.my_date[1]) ? time.get(item.my_date[1]) : "-",
						]
						if (status[i] === "watching") {
							array[5] = `${item.node.my_list_status.num_episodes_watched}${item.node.num_episodes !== 0 ? `/${item.node.num_episodes}` : "/?"}`
							array[6] = time.ago(new Date(new Date(item.node.my_list_status.updated_at).getTime() - 1), i)
							array[7] = time.get(new Date(item.node.my_list_status.start_date))
						}
						if (status[i] === "completed") {
							array.splice(5, 0, time.ago(new Date(new Date(item.my_date[0].setTime(new Date(item.node.my_list_status.updated_at))).getTime() - 1), i))
							array[6] = time.get(new Date(item.node.my_list_status.start_date))
							array[7] = time.get(new Date(item.node.my_list_status.finish_date))
						}
						if (["on_hold", "dropped"].includes(status[i])) {
							array[5] = `${item.node.my_list_status.num_episodes_watched}${item.node.num_episodes !== 0 ? `/${item.node.num_episodes}` : "/?"}`
							array[6] = time.ago(new Date(new Date(item.node.my_list_status.updated_at).getTime() - 1), i)
							array[7] = time.get(new Date(item.node.my_list_status.start_date))
						}
						if (status[i] === "plan_to_watch") {
							array[3] = item.node.source
							array[5] = time.ago(new Date(new Date(item.node.my_list_status.updated_at).getTime() - 1), i)
						}
						return array
					}),
				],
				{ align: "c" },
			)
			outputFile(
				`List/Anime/${status[i]}.md`,
				fs
					.readFileSync("template/List.md", { encoding: "utf8" })
					.replace("<!--status-->", ["Watching", "Completed", "On Hold", "Dropped", "Plan to Watch"][i])
					.replace("<!--amount-->", output.length.toString())
					.replace("<!--list-->", markdown[i]),
			)
				.then(() => {
					console.log(`File ${status[i]}.md ${output.length} item saved!`)
				})
				.catch((err) => {
					console.error(err)
				})
		}
		outputFile(
			"README.md",
			fs
				.readFileSync("template/README.md", { encoding: "utf8" })
				.replace("<!--watching_anime-->", markdown[0].split("|").splice(0, 118).join("|"))
				.replace("<!--completed_anime-->", markdown[1].split("|").splice(0, 73).join("|"))
				.replace("<!--on_hold_anime-->", markdown[2].split("|").splice(0, 73).join("|"))
				.replace("<!--dropped_anime-->", markdown[3].split("|").splice(0, 73).join("|"))
				.replace("<!--plan_to_watch_anime-->", markdown[4].split("|").splice(0, 65).join("|"))
				.replace("<!--watching_amount-->", `${amount[0] ? `(${amount[0]})` : ""}`)
				.replace("<!--watching_amount_more-->", `${amount[0] > 11 ? `${amount[0] - 11} more` : ""}`)
				.replace("<!--completed_amount_more-->", `${amount[1] > 6 ? `${amount[1] - 6} more` : ""}`)
				.replace("<!--on_hold_amount_more-->", `${amount[2] > 6 ? `${amount[2] - 6} more` : ""}`)
				.replace("<!--dropped_amount_more-->", `${amount[3] > 6 ? `${amount[3] - 6} more` : ""}`)
				.replace("<!--plan_to_watch_amount_more-->", `${amount[4] > 6 ? `${amount[4] - 7} more` : ""}`)
				.replace("<!--watching_anime%-->", `${amount[4] ? `${((amount[0] / amount[4]) * 100).toFixed(2)}%` : "No plan"}`)
				.replace("<!--completed_anime%-->", `${(((amount[0] + amount[2] + amount[3] + amount[4]) / amount[1]) * 100).toFixed(2)}%`)
				.replace("<!--on_hold_anime%-->", `${((amount[2] / (amount[0] + amount[1] + amount[3] + amount[4])) * 100).toFixed(2)}%`)
				.replace("<!--dropped_anime%-->", `${((amount[3] / (amount[0] + amount[1] + amount[2] + amount[4])) * 100).toFixed(2)}%`)
				.replace("<!--plan_to_watch_anime%-->", `${((amount[4] / (amount[0] + amount[1] + amount[2] + amount[3])) * 100).toFixed(2)}%`),
		)
			.then(() => {
				console.log(`File README.md saved!`)
			})
			.catch((err) => {
				console.error(err)
			})
	} catch (err) {
		core.setFailed(`Action failed with error ${err}`)
	}
})()

export default status
