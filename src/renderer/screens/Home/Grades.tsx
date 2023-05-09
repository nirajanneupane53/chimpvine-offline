import {
  AiOutlineBook,
  AiOutlineCalculator,
  AiOutlineExperiment,
  AiOutlineLaptop,
} from 'react-icons/ai';
import { Link } from 'react-router-dom';

interface Subject {
  name: string;
  icon: JSX.Element;
  link: string;
}

interface Grade {
  grade: number;
  subjects: Subject[];
}

const grades: Grade[] = [
  {
    grade: 1,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade1_English_',
      },
      // {
      //   name: 'Math',
      //   icon: <AiOutlineCalculator />,
      //   link: 'G1Ma',
      // },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade1_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade1_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade1_Computer_',
      },
    ],
  },
  {
    grade: 2,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade2_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade2_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade2_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade2_Computer_',
      },
    ],
  },
  {
    grade: 3,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade3_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade3_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade3_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade3_Computer_',
      },
    ],
  },
  {
    grade: 4,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade4_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade4_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade4_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade4_Computer_',
      },
    ],
  },
  {
    grade: 5,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade5_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade5_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade5_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade5_Computer_',
      },
    ],
  },
  {
    grade: 6,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade6_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade6_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade6_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade6_Computer_',
      },
    ],
  },
  {
    grade: 7,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade7_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade7_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade7_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade7_Computer_',
      },
    ],
  },
  {
    grade: 8,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'Grade8_English_',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'Grade8_Math_',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'Grade8_Science_',
      },
      {
        name: 'Computer',
        icon: <AiOutlineLaptop />,
        link: 'Grade8_Computer_',
      },
    ],
  },
];

const Grades = () => {
  return (
    <div>
      <h2 className="fw-bold ">Grades</h2>
      <div className="d-flex justify-content-between mt-4">
        {grades.map((grade) => (
          <div key={grade.grade}>
            <h4 className="fw-bold text-black-50">Grade {grade.grade}</h4>
            <div>
              {grade.subjects.map((subject) => (
                <div key={subject.name} className="mt-2 fw-bold">
                  {/* <a href={subject.link} className="d-flex align-items-center"> */}

                  <Link
                    // to={`/subject/${subject.link}`}
                    to={`/subject/${subject.link}?grade=${grade.grade}&subject=${subject.name}`}
                    className="d-flex align-items-center"
                  >
                    {subject.icon}
                    <div className="mx-1"></div> {subject.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Grades;
