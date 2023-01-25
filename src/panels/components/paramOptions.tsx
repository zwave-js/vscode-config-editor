export interface ParamOptionsProps {
	options: {
		$if?: string;
		label: string;
		value: number;
	}[];
	defaultValue: number;
}

export const ParamOptions: React.FC<ParamOptionsProps> = ({
	options,
	defaultValue,
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
						<td>{option.value === defaultValue && "★"}</td>
						<td>{option.label}</td>
						<td>{option.value}</td>
						{hasCondition && (
							<td>{option.$if && <code>{option.$if}</code>}</td>
						)}
					</tr>
				))}
			</tbody>
		</table>
	);
};
