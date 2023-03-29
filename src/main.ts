import * as core from '@actions/core'
import { getSuggestions } from './api/chatgpt'
import { Inputs } from './constants'
import {context, getOctokit} from '@actions/github'


async function run(): Promise<void> {
  try { 
    const apiKey = core.getInput(Inputs.APIKey, {required: true})
    const model = core.getInput(Inputs.Model)
    const temperature = core.getInput(Inputs.Temperature)
    const top_p = core.getInput(Inputs.TopP)
    const token = core.getInput(Inputs.Token)

    // ode, model, apiKey, organization, max_tokens, temperature, apiBaseUrl
    await getSuggestions({
      code: "<h1>weird code<h2>", model, apiKey, temperature, token})
  } catch (error) {
    core.setFailed(error instanceof Error ? error : String(error))
  }
}


async function writeComment(
  message: string
): Promise<void> {

  const octokit = getOctokit(core.getInput(Inputs.Token))

  const resOne = await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: context.payload.pull_request?.number || 1,
    body: message
  });
}


run()
