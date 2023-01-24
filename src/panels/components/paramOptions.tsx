export interface ParamOptionsProps {
	options: {
		label: string;
		value: number;
		isDefault: boolean;
	}[];
}

export const ParamOptions: React.FC<ParamOptionsProps> = ({ options }) => {
	if (!options.length) {
		return (
			<div className="param-preview__options">No options available</div>
		);
	}

	return (
		<div className="param-preview__options">
			<label>Possible values:</label>
			<table>
				<thead>
					<tr>
						<th>Label</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					{options.map((option) => (
						<tr
							className={option.isDefault ? "default" : ""}
							key={option.label}
						>
							<td>{option.label}</td>
							<td>{option.value}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
