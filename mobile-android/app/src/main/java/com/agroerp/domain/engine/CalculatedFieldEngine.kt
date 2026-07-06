package com.agroerp.domain.engine

import com.agroerp.domain.model.FormField
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CalculatedFieldEngine @Inject constructor() {

    private val safeExpression = Regex("""^[\d\s+\-*/().{}a-zA-Z_]+$""")

    fun resolve(
        fields: List<FormField>,
        data: Map<String, Any?>,
    ): Map<String, Any?> {
        val resolved = data.toMutableMap()
        for (field in fields) {
            if (field.type != "calculated" || field.calculate == null) continue
            val config = field.calculate
            if (config.dependsOn.any { resolved[it] == null }) continue
            try {
                resolved[field.key] = evaluateExpression(config.expression, resolved)
            } catch (_: Exception) {
                // Skip invalid calculated values
            }
        }
        return resolved
    }

    private fun evaluateExpression(
        expression: String,
        data: Map<String, Any?>,
    ): Double {
        var expr = expression
        for ((key, value) in data) {
            val token = "{$key}"
            if (expr.contains(token)) {
                val num = (value as? Number)?.toDouble()
                    ?: value.toString().toDoubleOrNull()
                    ?: throw IllegalArgumentException("Non-numeric dependency: $key")
                expr = expr.replace(token, num.toString())
            }
        }
        if (!safeExpression.matches(expr)) {
            throw IllegalArgumentException("Unsafe expression")
        }
        return ExpressionEvaluator.eval(expr)
    }
}

/** Minimal safe arithmetic evaluator (no Function/JS). */
private object ExpressionEvaluator {
    fun eval(expr: String): Double {
        return Parser(expr.replace(" ", "")).parse()
    }

    private class Parser(private val input: String) {
        private var pos = 0

        fun parse(): Double = parseExpression()

        private fun parseExpression(): Double {
            var result = parseTerm()
            while (pos < input.length) {
                when (input[pos]) {
                    '+' -> { pos++; result += parseTerm() }
                    '-' -> { pos++; result -= parseTerm() }
                    else -> break
                }
            }
            return result
        }

        private fun parseTerm(): Double {
            var result = parseFactor()
            while (pos < input.length) {
                when (input[pos]) {
                    '*' -> { pos++; result *= parseFactor() }
                    '/' -> { pos++; result /= parseFactor() }
                    else -> break
                }
            }
            return result
        }

        private fun parseFactor(): Double {
            if (input[pos] == '(') {
                pos++
                val result = parseExpression()
                if (pos < input.length && input[pos] == ')') pos++
                return result
            }
            val start = pos
            if (input[pos] == '-') pos++
            while (pos < input.length && (input[pos].isDigit() || input[pos] == '.')) pos++
            return input.substring(start, pos).toDouble()
        }
    }
}
