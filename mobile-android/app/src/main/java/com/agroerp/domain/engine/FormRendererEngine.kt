package com.agroerp.domain.engine

import com.agroerp.domain.model.FormField
import com.agroerp.domain.model.FormSchema
import com.agroerp.domain.model.RenderedField
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FormRendererEngine @Inject constructor(
    private val conditional: ConditionalLogicEngine,
    private val calculated: CalculatedFieldEngine,
) {

    fun render(
        schema: FormSchema,
        partialData: Map<String, Any?> = emptyMap(),
    ): List<RenderedField> {
        val resolved = calculated.resolve(schema.fields, partialData)
        return schema.fields.map { field ->
            val visible = conditional.isVisible(field.visibleWhen, resolved)
            val effectiveRequired = if (visible) {
                conditional.isRequired(field.required, field.requiredWhen, resolved)
            } else {
                false
            }
            RenderedField(
                field = field,
                visible = visible,
                effectiveRequired = effectiveRequired,
                computedValue = if (field.type == "calculated") resolved[field.key] else null,
            )
        }
    }
}
