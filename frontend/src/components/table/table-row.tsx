import clsx from 'clsx'
import { Column, DataRow } from './helpers/types'
import styles from './table.module.scss'

interface TableRowProps {
    rowData: DataRow
    columnsData: Column[]
    rowIndex: number
}

export default function TableRow({
    columnsData,
    rowData,
    rowIndex,
}: TableRowProps) {
    return (
        <div className={styles.table__row}>
            {columnsData.map((column) => {
                return (
                    <div
                        key={column.key}
                        className={clsx(
                            styles.table__cell,
                            column.extraClassTableCell &&
                                column.extraClassTableCell
                        )}
                    >
                        {column.render
                            ? column.render(rowData, rowIndex)
                            : rowData[column.dataIndex].title}
                    </div>
                )
            })}
        </div>
    )
}
