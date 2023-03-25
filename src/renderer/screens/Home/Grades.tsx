import {
  AiOutlineBook,
  AiOutlineCalculator,
  AiOutlineExperiment,
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
        link: 'G1En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G1Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G1Sc',
      },
    ],
  },
  {
    grade: 2,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G2En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G2Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G2Sc',
      },
    ],
  },
  {
    grade: 3,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G3En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G3Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G3Sc',
      },
    ],
  },
  {
    grade: 4,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G4En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G4Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G4Sc',
      },
    ],
  },
  {
    grade: 5,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G5En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G5Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G5Sc',
      },
    ],
  },
  {
    grade: 6,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G6En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G6Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G6Sc',
      },
    ],
  },
  {
    grade: 7,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G7En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G7Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G7Sc',
      },
    ],
  },
  {
    grade: 8,
    subjects: [
      {
        name: 'English',
        icon: <AiOutlineBook />,
        link: 'G8En',
      },
      {
        name: 'Math',
        icon: <AiOutlineCalculator />,
        link: 'G8Ma',
      },
      {
        name: 'Science',
        icon: <AiOutlineExperiment />,
        link: 'G8Sc',
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
