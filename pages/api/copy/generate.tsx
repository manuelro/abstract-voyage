import type { NextApiRequest, NextApiResponse } from 'next';
import type { CopyResponse, Extraction } from '../../../helpers/copy/schema';

const buildMockResponse = (extraction: Extraction): CopyResponse => {
  const strategies = ['strategy_a', 'strategy_b', 'strategy_c'];
  return {
    brief: {
      sectionType: extraction.sectionType || 'unknown',
      sectionJob: 'Mock: demonstrate the preview loop with placeholder copy.',
      servesPageJob: 'Mock: this section supports the page purpose by previewing the copy tool.',
      readerAssumedToKnow: 'Mock: the reader has context from prior sections.',
      assumptions: ['This is a mock response for testing the preview loop.'],
      inheritsBeat: null,
      opensThreads: [],
    },
    variants: strategies.map((strategyId, index) => ({
      strategyId,
      label: `Mock variant ${index + 1}`,
      rationale: `This mock variant ${index + 1} demonstrates a different approach.`,
      proofHoles: [],
      nodes: extraction.nodes.map(node => ({
        id: node.id,
        text: `[V${index + 1}] ${node.text.slice(0, Math.max(20, node.budget.target - 10))}...`,
        overBudget: false,
        proofRefs: [],
      })),
    })),
  };
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<CopyResponse | { pageMap: Record<string, never>; taxonomy: Record<string, never> } | { error: string }>,
) {
  if (req.method === 'GET') {
    res.status(200).json({ taxonomy: {}, pageMap: {} });
    return;
  }

  if (req.method === 'POST') {
    res.status(200).json(buildMockResponse(req.body as Extraction));
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
}
