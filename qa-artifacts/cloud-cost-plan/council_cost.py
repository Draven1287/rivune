#!/usr/bin/env python3
"""Synthetic Council arithmetic only. No inference, network, billing or profit calculation."""
import argparse
import json
from decimal import Decimal
from pathlib import Path


def cost(model, input_tokens, output_tokens):
    if type(input_tokens) is not int or type(output_tokens) is not int or min(input_tokens, output_tokens) < 0:
        raise ValueError('Token counts must be nonnegative integers')
    if input_tokens > model.get('maximum_input_tokens_for_these_rates', input_tokens):
        raise ValueError('Input exceeds the context band covered by these supplied rates')
    input_rate = Decimal(model['input_usd_per_million'])
    output_rate = Decimal(model['output_usd_per_million'])
    if not input_rate.is_finite() or not output_rate.is_finite() or min(input_rate, output_rate) < 0:
        raise ValueError('Rates must be finite and nonnegative')
    return (input_rate * input_tokens + output_rate * output_tokens) / Decimal(1000000)


def calculate(spec):
    results = []
    for model in spec['models'].values():
        if model.get('valid_through') and spec['price_checked_date'] > model['valid_through']:
            raise ValueError('Scenario date is beyond a supplied promotional rate window')
    for tier in spec['tiers']:
        a, b = [spec['models'][key] for key in tier['members']]
        lead = spec['models'][tier['orchestrator']]
        for size, shape in spec['jobs'].items():
            input_tokens = shape['request_and_draft_instructions_tokens']
            draft_billed = shape['draft_visible_tokens'] + shape['draft_thinking_tokens']
            synth_input = input_tokens + 2 * shape['draft_visible_tokens'] + shape['synthesis_extra_instructions_tokens']
            synth_billed = shape['final_visible_tokens'] + shape['synthesis_thinking_tokens']
            repair_input = synth_input + shape['final_visible_tokens'] + shape['repair_extra_instructions_tokens']
            draft_a = cost(a, input_tokens, draft_billed)
            draft_b = cost(b, input_tokens, draft_billed)
            synthesis = cost(lead, synth_input, synth_billed)
            repair = cost(lead, repair_input, synth_billed)
            failed_draft_allowance = max(draft_a, draft_b)
            base = draft_a + draft_b + synthesis
            results.append({
                'tier': tier['name'], 'size': size, 'base_call_count': 3,
                'stress_call_count': 5,
                'drafts_input_tokens_each': input_tokens,
                'drafts_billed_output_tokens_each': draft_billed,
                'synthesis_input_tokens': synth_input,
                'synthesis_billed_output_tokens': synth_billed,
                'repair_input_tokens': repair_input,
                'draft_a_usd': str(draft_a), 'draft_b_usd': str(draft_b),
                'synthesis_usd': str(synthesis), 'base_usd': str(base),
                'one_synthesis_repair_usd': str(repair),
                'one_fully_billed_failed_draft_allowance_usd': str(failed_draft_allowance),
                'stress_usd': str(base + repair + failed_draft_allowance),
            })
    return {'status': 'synthetic_estimate_not_measured', 'currency': 'USD', 'price_snapshot_date': spec['price_checked_date'],
            'exclusions': ['hosting', 'tools/search', 'cache charges', 'images/audio/video',
                           'tax/payment fees', 'support/refunds', 'extra workers or calls',
                           'tokens beyond the stated assumptions'],
            'profit': None, 'results': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('scenario', type=Path)
    args = parser.parse_args()
    print(json.dumps(calculate(json.loads(args.scenario.read_text())), indent=2))


if __name__ == '__main__':
    main()
