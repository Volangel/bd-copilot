import { analyzeProject, scoreProject, generateOutreach, generateSequenceSteps, describeAiMode } from "./aiService";
import { AnalyzeProjectArgs } from "./types";

export async function runAiSmokeTest() {
  const baseArgs: AnalyzeProjectArgs = {
    html: "Example Web3 infra for scaling on L2 with security and BD partnerships.",
    url: "https://example.com",
    icpProfile: { industries: "infra, defi", painPoints: "scaling, security" },
    userPlan: "free",
  };

  console.log("[AI SMOKE] mode (free):", describeAiMode("free"));
  await analyzeProject(baseArgs);
  await scoreProject({ analysis: await analyzeProject(baseArgs), icpProfile: baseArgs.icpProfile, userPlan: "free" });
  await generateOutreach({
    analysis: await analyzeProject(baseArgs),
    contact: { name: "Test User" },
    channels: ["email"],
    userPlan: "free",
  });
  await generateSequenceSteps({ analysis: await analyzeProject(baseArgs), userPlan: "free" });

  const paidArgs = { ...baseArgs, userPlan: "pro" as const };
  console.log("[AI SMOKE] mode (pro):", describeAiMode("pro"));
  await analyzeProject(paidArgs);
  await scoreProject({ analysis: await analyzeProject(paidArgs), icpProfile: baseArgs.icpProfile, userPlan: "pro" });
  await generateOutreach({
    analysis: await analyzeProject(paidArgs),
    contact: { name: "Test User" },
    channels: ["email"],
    userPlan: "pro",
  });
  await generateSequenceSteps({ analysis: await analyzeProject(paidArgs), userPlan: "pro" });
}
