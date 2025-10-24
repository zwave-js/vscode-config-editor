export interface ParamOptionsProps {
	options: {
		$if?: string;
		label: string;
		value: number;
	}[];
	defaultValue: number;
	recommendedValue?: number;
}

export const ParamOptions: React.FC<ParamOptionsProps> = ({
	options,
	defaultValue,
	recommendedValue,
}) => {
	if (!options.length) {
		return (
			<div className="param-preview__options empty">
				No options available
			</div>
		);
	}

	const hasCondition = options.some((option) => option.$if);

	return (
		<table className="param-preview__options">
			<thead>
				<tr>
					<th></th>
					<th>Label</th>
					<th>Value</th>
					{hasCondition && <th>Condition</th>}
				</tr>
			</thead>
			<tbody>
				{options.map((option) => (
					<tr key={option.label}>
						<td>{option.value === recommendedValue && "★"}</td>
						<td
							className={
								option.value === defaultValue ? "default" : ""
							}
						>
							{option.label}
						</td>
						<td
							className={
								option.value === defaultValue ? "default" : ""
							}
						>
							{option.value}
						</td>
						{hasCondition && (
							<td>{option.$if && <code>{option.$if}</code>}</td>
						)}
					</tr>
				))}
			</tbody>
		</table>
	);
};
