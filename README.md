import itertools
import math

def safe_eval(a, b, op):
    try:
        if op == '+': return a + b
        elif op == '-': return a - b
        elif op == '*': return a * b
        elif op == '/': return a / b if b != 0 else None
        elif op == '^':
            if a == 0 and b <= 0: return None
            if abs(b) > 10 or abs(a) > 100: return None
            return a ** b
    except:
        return None
    return None

def try_fact(n):
    if isinstance(n, int) and 0 <= n <= 100:
        return math.factorial(n)
    return None

def apply_factorial_if_possible(val, expr):
    fact_val = try_fact(val)
    if fact_val is not None:
        return fact_val, f"({expr})!"
    else:
        return None

def combine(a_val, a_expr, b_val, b_expr):
    ops = ['+', '-', '*', '/', '^']
    # Yield normal operations
    for op in ops:
        result = safe_eval(a_val, b_val, op)
        if result is not None:
            yield result, f"({a_expr} {op} {b_expr})"

def solve_qu0x(dice, target):
    fact_choices = list(itertools.product([False, True], repeat=5))

    for perm in itertools.permutations(dice):
        for facts in fact_choices:
            values = []
            exprs = []
            skip = False
            for i, use_fact in enumerate(facts):
                val = perm[i]
                if use_fact:
                    f = try_fact(val)
                    if f is None:
                        skip = True
                        break
                    values.append(f)
                    exprs.append(f"({val})!")
                else:
                    values.append(val)
                    exprs.append(str(val))
            if skip:
                continue

            stack = [(values, exprs)]
            while stack:
                vals, exps = stack.pop()
                if len(vals) == 1:
                    if abs(vals[0] - target) < 1e-6:
                        return f"{exps[0]} = {target}"
                    continue

                for i in range(len(vals)):
                    for j in range(len(vals)):
                        if i == j:
                            continue
                        a_val, b_val = vals[i], vals[j]
                        a_exp, b_exp = exps[i], exps[j]

                        remaining_vals = [vals[k] for k in range(len(vals)) if k != i and k != j]
                        remaining_exps = [exps[k] for k in range(len(exps)) if k != i and k != j]

                        # Combine normally
                        for new_val, new_exp in combine(a_val, a_exp, b_val, b_exp):
                            # Also try factorial on the new intermediate result
                            stack.append((remaining_vals + [new_val], remaining_exps + [new_exp]))
                            fact_result = apply_factorial_if_possible(new_val, new_exp)
                            if fact_result is not None:
                                f_val, f_exp = fact_result
                                stack.append((remaining_vals + [f_val], remaining_exps + [f_exp]))

    return "No solution found"


dice = [1, 1, 5, 3, 10]
target = 24
print(solve_qu0x(dice, target))
