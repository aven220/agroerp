package com.agroerp.domain.engine

import com.agroerp.domain.model.ConditionalRule
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConditionalLogicEngine @Inject constructor() {

    fun isVisible(
        rules: List<ConditionalRule>,
        data: Map<String, Any?>,
    ): Boolean {
        if (rules.isEmpty()) return true
        return rules.all { evaluate(it, data) }
    }

    fun isRequired(
        baseRequired: Boolean,
        rules: List<ConditionalRule>,
        data: Map<String, Any?>,
    ): Boolean {
        if (rules.isNotEmpty()) return isVisible(rules, data)
        return baseRequired
    }

    fun evaluate(rule: ConditionalRule, data: Map<String, Any?>): Boolean {
        val fieldValue = data[rule.field]
        val hasValue = fieldValue != null && fieldValue != ""

        return when (rule.operator) {
            "empty" -> !hasValue
            "not_empty" -> hasValue
            "eq" -> compare(fieldValue, rule.value) == 0
            "neq" -> compare(fieldValue, rule.value) != 0
            "gt" -> toDouble(fieldValue) > toDouble(rule.value)
            "gte" -> toDouble(fieldValue) >= toDouble(rule.value)
            "lt" -> toDouble(fieldValue) < toDouble(rule.value)
            "lte" -> toDouble(fieldValue) <= toDouble(rule.value)
            "in" -> {
                val list = rule.value as? List<*> ?: return false
                list.any { compare(fieldValue, it) == 0 }
            }
            "not_in" -> {
                val list = rule.value as? List<*> ?: return true
                list.none { compare(fieldValue, it) == 0 }
            }
            else -> true
        }
    }

    private fun compare(a: Any?, b: Any?): Int {
        if (a == b) return 0
        if (a is Number && b is Number) return a.toDouble().compareTo(b.toDouble())
        return a.toString().compareTo(b.toString())
    }

    private fun toDouble(value: Any?): Double =
        when (value) {
            is Number -> value.toDouble()
            is String -> value.toDoubleOrNull() ?: 0.0
            is Boolean -> if (value) 1.0 else 0.0
            else -> 0.0
        }
}
