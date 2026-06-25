# Continual Harness: An Efficient Self-Improving Agent on ARC-AGI-3

<p class="authors">Ruirong Feng, Seth Karten, Wenzhe Li, Chengshuai Shi, Chi Jin</p>
<p class="affiliation">Princeton University</p>

<div class="btn-row">
<a class="btn" href="https://arxiv.org/abs/2605.09998">Original Paper</a>
<a class="btn" href="https://github.com/feng-rrRay/Continual-Harness-ARC-AGI-3/">Code</a>
<a class="btn" href="https://arcprize.org/scorecards/ac3eeaf5-6ace-4d2d-bf29-9469fd00a57b">Scorecard</a>
</div>

---

Long-horizon interactive tasks remain difficult for language models because useful experience does not fit neatly into a finite context window. We introduced Continual Harness to address this problem through automated trajectory distillation and harness self-improvement.

Continual Harness is a reset-free, self-improving agentic harness that enables a foundation model to store memories, write reusable skills, deploy subagents, and refine its own prompt during interactive tasks. On Pokémon Red and Emerald, Continual Harness started from scratch with no prior memory, hand-crafted tools, or domain-specific scaffolding, and completed early-to-mid milestones of both games with comparative efficiency to the hand-crafted harness. 

This raises two natural questions:

```markdown
1. Can Continual Harness discover hidden rules in games designed to be unknown at test time?
2. Which part of Continual Harness contributes most to its long-horizon progress? 
```

We study these questions on the public set of the ARC-AGI-3 benchmark.

ARC-AGI-3 evaluates the interactive reasoning ability of LLM agents across 25 public games in a shared environment. The benchmark remains difficult for LLM agents because each game must be played without provided rules or domain-specific knowledge, and the scoring function accounts for action efficiency. The agent must therefore explore wisely and act efficiently. As of Jun 23 2026, the best CoT model `Claude Opus 4.8 (high)` only reached 1.5% on the public benchmark, and the officially released harness (OpenClaw with `Claude Opus 4.7`) only scored 5.2%.

Starting from minimal information about the game environment (without even a color legend for the ASCII map) and using strictly sandboxed code execution, Continual Harness scored 20.54% with a total cost of only $774. This makes it one of the most cost-efficient agentic harnesses on the leaderboard. To better understand where the gain comes from, we also implemented a Hermes-based harness with comparable architecture and prompting as an ablation.

Here are our key findings:
- **Unknown games need an editable world model.** Continual Harness generalizes by turning interaction history into a live surrogate state made of policy, memory, skills, and subagents. The useful design lesson is to store hypotheses as an editable state, track how strongly they are supported, and let later evidence revise them.  
- **Reusable skills turn early exploration into future efficiency.** Across 25 games, 62% of Continual Harness's executed actions come from saved skills. This allows later decisions to reuse a tested routine instead of re-solving the same subproblem through fresh VLM deliberation. For long-horizon agents, recurring computation should be promoted into reusable skills with clear inputs, outputs, and trigger conditions.  
- **Reset-free refinement allows the model to bootstrap.** Continual Harness has the Refiner reread raw trajectories and updates the policy, memory, skills, and subagents without restarting the run. This lets the model convert noisy trial-and-error into a cleaner world model and solve later levels with much smaller action budgets. The next improvement is stronger evidence auditing, so weak guesses and noisy trajectory segments are less likely to enter a persistent state.


![score vs cost on the ARC-AGI-3 public set](artifacts/figures/leaderboard_cost_score.svg)

<div data-embed="replay-top"></div>

## Architecture

Following the architecture introduced in our original paper (arXiv: 2605.09998), Continual Harness consists of four editable components (system prompt \(p\), sub-agents \(\mathcal{G}\), skills \(\mathcal{K}\), and memory \(\mathcal{M}\)) plus an automated Refiner that rewrites \(p, \mathcal{G}, \mathcal{K}, \mathcal{M}\) in place from trajectory analysis. The four components serve distinct roles:
- The **system prompt \(p\)** is a text state encoding the agent's current strategy, including active hypotheses, planned experiments, optimal tool usage, and known failure modes. 
- **Memory \(\mathcal{M}\)** stores persistent facts and candidate rules. 
- **Skills \(\mathcal{K}\)** are reusable Python routines that run sandboxed on the current observation and either emit actions or return structured results. 
- **Subagents \(\mathcal{G}\)** handle specialized multi-step subtasks in isolated contexts.
The orchestrator edits these components through CRUD-style tool calls: `process_skill`, `process_memory`, and `process_subagent`; The remaining execution tools are `take_actions`, `run_skill`, and `run_subagent`.

When the weight of the foundation model is frozen, Continual Harness makes continual learning possible by using its four editable components as an external world model. At each step \(t\), Continual Harness adaptively maps the interaction history \(H_t = (o_1, a_1, o_2, a_2, \ldots, o_t)\) into an editable surrogate state \(z_t = (p_t, \mathcal{G}_t, \mathcal{K}_t, \mathcal{M}_t)\). The surrogate state stores the agent's current understanding of the game. The orchestrator then acts by conditioning the foundation model \(\theta_{\mathrm{FM}}\) on both the current observation and the learned surrogate world model:
\[
    a_t \sim \pi_{\theta_{\mathrm{FM}}}(\cdot \mid o_t, z_t).
\]

At each game-state boundary, the orchestrator assembles its decision context from the system prompt \(p_t\), the current observation, recent interaction history, and an overview of available memory entries, skills, and subagents. The current observation contains both an ASCII grid and a rendered image. For multi-grid frames, we include the first and last grids when they differ; otherwise, we select key animation frames that summarize the transition. The orchestrator then chooses among `process_skill`, `run_skill`, `process_memory`, `process_subagent`, `run_subagent`, and `take_actions`.

For ARC-AGI-3, we made three changes to improve tool use and exploration. 

First, we changed when the user prompt is rebuilt. The prompt is now fully resembled only after tool calls that can change the game state: `take_actions`, `run_subagent`, and action-firing `run_skill`. tool calls that only edit the harness state or perform analysis (e.g., `process_skill`, `process_memory`, `process_subagent`, and non-action-firing `run_skill`) do not trigger a full prompt rebuild. Their outputs are appended to the ongoing conversation until the next game-state-changing action occurs. This preserves the local reasoning chain across internal edits and analysis calls.

![ARC-AGI-3 continual harness loop](artifacts/figures/arcagi3_continual_harness_loop.png)

Second, we trigger the Refiner after game-over and level-up events, in addition to the periodic refining loop that runs every \(F\) steps.

Third, we add a `confidence` field to each memory entry, where `1 = untested guess, 2 = weak evidence, 3 = unverified inference, 4 = confirmed once, 5 = repeatedly confirmed`. This enables the preservation of speculative rules and reduces the risk that hallucinated or weakly supported claims dominate future decisions.

<div data-embed="prompt-loop"></div>

## Experimental setup

We evaluate Continual Harness and Hermes on 25 public games of ARC-AGI-3 using the same foundation model `gemini-3.1-pro-preview` and matched environmental interfaces. All games run once in `online` mode without cherry-picking or prior information to the agent. 

Continual Harness follows the architecture described above, and each game stops when per-level actions exceed \(5\times\) the human baseline, total actions exceed 5,000, or session cost exceeds $100.
Hermes agent runs inside a Docker container and interacts with the ARC-AGI-3 environment through an MCP game server exposing only `get_game_state` and `take_actions`. It retains its built-in tools for code execution, file access, memory, skills, and session search, and uses a stopping threshold of 10,000 actions.
Neither agent has access to game rules, source code, the scoring method, environment files, or any task-specific privileged information.

We use Hermes as an additional baseline because it also focuses on updating skills over an agent's session. Hermes shares the same model and environment interface as Continual Harness, so the comparison is more controlled than to other leaderboard harnesses. Community leaderboard entries are reported as external reference points.

## Results

The evaluation result of Continual Harness reveals its strength in action efficiency. The 20.54% score of Continual Harness outperforms both the controlled Hermes baseline (8.25%) and the public OpenClaw reference point (5.20%) at a much lower cost. This suggests that the gain does not come from spending more inference budget. 

The clearest pattern appears in the comparison with Hermes. Hermes completes slightly more levels overall (70 vs. 64) but scores less than half as many points because its completed levels require far more actions. On completed levels, the average action ratio relative to the human baseline is \(15.30\times\) for Hermes, compared with only \(1.48\times\) for Continual Harness. The largest gains for Continual Harness come from games where the agent discovers a mechanic early and then solves later levels with much lower action cost (`lp85`, `sp80`, `m0r0`, `cn04`, `ft09`).

![score comparison](artifacts/figures/score_comparison.png)

![level heatmap](artifacts/figures/level_progression_heatmaps.png)

The broader leaderboard comparison indicates the same pattern. OpenClaw completes 28 / 183 levels with 9010 total actions and reaches 5.20%, showing how quickly inefficient exploration is penalized. `a-evolve MAS Evolved` is a closer self-improving reference point. It reports the same completed levels as Continual Harness, but scores 12.30% at $5,300. The difference suggests that Continual Harness benefits from its specific form of self-improvement: a reset-free Refiner that reviews trajectories outside the orchestrator's immediate context and updates the harness while the game continues.

We look inside the successful runs to understand where the efficiency of Continual Harness comes from. Two patterns explain most of the gain: reusable skills turn discovered mechanics into cheap execution routines, and reset-free refinement keeps the harness's world model aligned as trajectories grow longer.


#### **Reusable skills turn discovery into cheap execution**

Continual Harness turns discovered mechanics into reusable execution routines. Across the 25 games, 62% of its executed actions originate from saved skills rather than fresh VLM deliberation. On `cn04` and `ft09`, the share exceeds 80%. This reuse also appears in the tool-call profile. Among 7,307 tool calls, 64% replay learned skills and 35% create or refine skills and memory.

The Hermes ablation shows what happens when useful computation stays transient. Hermes makes 18,717 tool calls, and 86% are `execute_code`. Only 0.07% persist skills or memory. Useful scripts such as BFS solvers, grid parsers, and state trackers are repeatedly written as one-off code, used locally, and discarded. Continual Harness gains efficiency because useful computation becomes part of the harness state instead of remaining scratch work.

![tool call distribution](artifacts/figures/tool_call_distribution.png)


#### **Reset-free refinement keeps the world model aligned**

Reset-free refinement explains why late levels become the primary source of Continual Harness's score gain. After a level-up, game-over or stagnation point, the refiner rereads the raw trajectory, identifies observations that reveal stable game mechanics, and consolidates the learned mechanics into the live decision context. All four components of the surrogate state (policy, skills, memory, and subagents) are jointly refined, so that corrected abstractions propagate into execution routines, and the harness assembles a self-contained world model from scattered evidence.

<div data-embed="refinement-lift"></div>

The `lp85` and `cn04` traces show how reset-free refinement keeps the harness state aligned with the game. In `lp85`, game-over and stagnation points become checkpoints for rereading the trajectory, rewriting the policy, and saving executable skills once a reusable routine is supported by evidence. Rules and mechanics memories accumulate during refinements, and skill operations gradually shift from exploration toward exploitation as the harness gathers a more computable rule model. After the relevant method is compiled into the harness, later levels require much smaller action budgets.

<div data-embed="lp85-policy"></div>

<div data-embed="replay-lp85"></div>

In `cn04`, refinement turns a partial early model into a precise rule that later levels can reuse directly. The memory curve shows steady accumulation of rule and mechanics entries across refinements, while the skill operations remain balanced between analysis, solver planning, and execution. The trace example shows how refinement converts trajectory evidence into lower-cost execution.

<div data-embed="cn04-behavior"></div>

<div data-embed="replay-cn04"></div>


## What's next

Continual Harness already shows a strong balance between exploration and exploitation on unknown interactive tasks. The next step is to make that balance more reliable. In long-horizon games, weak hypotheses can accumulate into misleading memory, brittle skills, or overconfident policy updates. Better exploration should therefore focus on evidence quality. 
Meanwhile, the ability of Continual Harness is dependent on the foundation model. On open-source VLMs, the performance of Continual Harness may not be as good as on frontier closed models. 

We see two directions from here. First, exploration should become more disciplined. The Refiner needs better ways to audit evidence, compare competing hypotheses, and decide which trajectory segments are worth turning into memory, skills, or policy updates.

Second, the harness should become less dependent on frontier closed models. Continual Harness trajectories may provide training data for open-source VLMs, so that smaller reproducible agents can learn to use memory, skills, and refinement with similar long-horizon discipline.