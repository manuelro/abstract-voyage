export const formatDate = (date: string) => {
    const dateObj = new Date(date)
    const month = dateObj.getMonth()
    const day = dateObj.getDate()
    const year = dateObj.getFullYear()
    const months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    let formattedDate: string | null = null
    if(!Number.isNaN(month)) {
        formattedDate = `${months[month]}, ${year}`
    }

    return formattedDate
}